import { combineResolvers } from "graphql-resolvers";
import { isAuthenticated } from "./authorization.js";
import moment from "moment";
import mongoose from "mongoose";

const ObjectId = mongoose.Types.ObjectId;

export default {
  Query: {
    getReports: combineResolvers(
      isAuthenticated,
      async (parent, args, { models, me }, info) => {
        return new Promise(async (resolve, reject) => {
          try {
            const page = Number(args.page) || 1;
            const limit = Number(args.limit) || 10;
            
            // 🔎 Date filter
            let startDate = args?.startDate ? new Date(args.startDate) : null;
            startDate.setUTCHours(0, 0, 0, 0);
            let endDate = args?.endDate ? new Date(args.endDate) : null;
            endDate.setUTCHours(23, 59, 59, 999);

          // Build the base match stage for multiple sites
          const baseMatch = {
            isDeleted: false,
            $expr: {
              $and: [
                { $gte: [{ $toDate: "$date" }, startDate] },
                { $lte: [{ $toDate: "$date" }, endDate] }
              ]
            }
          };
            // Handle site validation more gracefully
          if (!args.site || (Array.isArray(args.site) && args.site.length === 0)) {
            // If user is admin, allow empty site to get all reports
            if (me?.isAdmin) {
              // Admin can see all reports without site filter
            } else {
              throw new Error("The `site` argument is required and cannot be empty.");
            }
          }

          // Add site filter based on whether it's single or multiple sites
          if (Array.isArray(args.site) && args.site.length > 0) {
            baseMatch.site = { $in: args.site };
          } else if (args.site) {
            baseMatch.site = args.site;
          }

          const aggregation = [
            { $match: baseMatch },
            { $sort: { date: -1 } }
          ]

          // ---------------------------
          // Case 1: No country filter
          // ---------------------------
          if (!args.country || args.country.length === 0) {
            // Determine grouping based on byDate parameter
            // For multiple sites: group by site + date (if byDated=true) or just site (if byDated=false)
            const groupId = args.byDated 
              ? { site: "$site", date: "$date" }
              : { site: "$site" };
            

            aggregation.push(
              {
                $group: {
                  _id: groupId,
                  impressions: { $sum: "$impressions" },
                  clicks: { $sum: "$clicks" },
                  // ctr: { $avg: "$ctr" },
                  // ecpm: { $avg: "$ecpm" },
                  revenue: { $sum: "$revenue" },
                  totalRequests: { $sum: "$totalRequests" },
                  costPerClick: { $avg: "$costPerClick" },
                  // ✅ Keep for weighted match rate calculation
                  matchRateWeightedSum: { $sum: { $multiply: ["$matchRate", "$totalRequests"] } },
                  matchRateTotalWeight: { $sum: "$totalRequests" },
                  date: args.byDated ? { $first: "$date" } : { $min: "$date" },
                  site: { $first: "$site" }
                }
              },
              {
                $project: {
                  id: args.byDated 
                    ? { $concat: [{ $toString: "$_id.site" }, "-", { $dateToString: { format: "%Y-%m-%d", date: "$_id.date" } }] }
                    : { $toString: "$_id.site" },
                  site: 1,
                  date: { $dateToString: { format: "%m-%d-%Y", date: "$date" } },
                  impressions: 1,
                  clicks: 1,
                  // ✅ Calculate CTR correctly from summed totals
                  ctr: {
                    $cond: {
                      if: { $gt: ["$impressions", 0] },
                      then: { $multiply: [{ $divide: ["$clicks", "$impressions"] }, 100] },
                      else: 0
                    }
                  },
                  // ✅ Calculate Match Rate using weighted average (Google's method)
                  matchRate: {
                    $cond: {
                      if: { $gt: ["$matchRateTotalWeight", 0] },
                      then: { $divide: ["$matchRateWeightedSum", "$matchRateTotalWeight"] },
                      else: 0
                    }
                  },
                  // ✅ Calculate eCPM correctly from revenue and impressions
                  ecpm: {
                    $cond: {
                      if: { $gt: ["$impressions", 0] },
                      then: { $multiply: [{ $divide: ["$revenue", "$impressions"] }, 1000] },
                      else: 0
                    }
                  },
                  revenue: 1,
                  totalRequests: 1,
                  costPerClick: 1,
                  country: null
                }
              }
            )
          }

          // ---------------------------
          // Case 2 + 3: Country filter
          // ---------------------------
          else {
            aggregation.push(
              {
                $project: {
                  site: 1,
                  date: 1,
                  countries: {
                    $map: {
                      input: { $objectToArray: "$countries" },
                      as: "c",
                      in: { country: "$$c.k", stats: "$$c.v" }
                    }
                  }
                }
              },
              { $unwind: "$countries" }
            )

            // Case 3: Specific countries (not ALL)
            if (!(args.country.length === 1 && args.country[0] === "ALL")) {
              aggregation.push({
                $match: { "countries.country": { $in: args.country } }
              })
            }

            // Determine grouping based on byDate parameter for country filter
            // If byDated is true: group by site + country + date (date-wise data per country per site)
            // If byDated is false: group by site + country only (average data per country per site)
            const countryGroupId = args.byDated
              ? { site: "$site", country: "$countries.country", date: "$date" }
              : { site: "$site", country: "$countries.country" };
            

            aggregation.push(
              {
                $group: {
                  _id: countryGroupId,
                  impressions: { $sum: "$countries.stats.impressions" },
                  clicks: { $sum: "$countries.stats.clicks" },
                  // ctr: { $avg: "$countries.stats.ctr" },
                  // ecpm: { $avg: "$countries.stats.ecpm" },
                  revenue: { $sum: "$countries.stats.revenue" },
                  totalRequests: { $sum: "$countries.stats.totalRequests" },
                  costPerClick: { $avg: "$countries.stats.costPerClick" },
                  // matchRate: { $avg: "$countries.stats.matchRate" },
                  // ✅ Keep for weighted match rate calculation
                  matchRateWeightedSum: { $sum: { $multiply: ["$countries.stats.matchRate", "$countries.stats.totalRequests"] } },
                  matchRateTotalWeight: { $sum: "$countries.stats.totalRequests" },
                  site: { $first: "$site" },
                  country: { $first: "$countries.country" },
                  date: args.byDated ? { $first: "$date" } : { $min: "$date" }
                }
              },
              {
                $project: {
                  id: args.byDated
                    ? { $concat: [{ $toString: "$_id.site" }, "-", "$_id.country", "-", { $dateToString: { format: "%Y-%m-%d", date: "$_id.date" } }] }
                    : { $concat: [{ $toString: "$_id.site" }, "-", "$_id.country"] },
                  site: 1,
                  date: { $dateToString: { format: "%m-%d-%Y", date: "$date" } },
                  country: 1,
                  impressions: 1,
                  clicks: 1,
                  // ✅ Calculate CTR correctly from summed totals
                  ctr: {
                    $cond: {
                      if: { $gt: ["$impressions", 0] },
                      then: { $multiply: [{ $divide: ["$clicks", "$impressions"] }, 100] },
                      else: 0
                    }
                  },
                  matchRate: {
                    $cond: {
                      if: { $gt: ["$matchRateTotalWeight", 0] },
                      then: { $divide: ["$matchRateWeightedSum", "$matchRateTotalWeight"] },
                      else: 0
                    }
                  },
                  ecpm: {
                    $cond: {
                      if: { $gt: ["$impressions", 0] },
                      then: { $multiply: [{ $divide: ["$revenue", "$impressions"] }, 1000] },
                      else: 0
                    }
                  },
                  revenue: 1,
                  totalRequests: 1,
                  costPerClick: 1,
                }
              }
            )
          }

          // ---------------------------
          // Final sorting and Pagination
          // ---------------------------
          // Add final sort to ensure consistent ordering for multiple sites
          aggregation.push(
            { $sort: { site: 1, date: -1 } }
          );
          
          aggregation.push({
            $facet: {
              metadata: [{ $count: "total" }],
              data: [
                { $skip: (args.page - 1) * args.limit },
                { $limit: args.limit }
              ]
            }
          });

            
            const result = await models?.DailyAdsManagerReport.aggregate(aggregation);
            const facet = result[0] || {};
            
            const totalDocs = facet.metadata[0]?.total || 0;
            const totalPages = Math.ceil(totalDocs / limit);

            // Calculate totals from all matching documents (not just paginated results)
            let totals = null;
            if (totalDocs > 0) {
              // Create a separate aggregation to get totals from ALL matching documents
              const totalsAggregation = [...aggregation];
              
              // Remove pagination and facet stages, add totals calculation
              const totalsPipeline = totalsAggregation.filter(stage => 
                !stage.$facet && !stage.$skip && !stage.$limit
              );
              
              // Add totals calculation at the end
              totalsPipeline.push({
                $group: {
                  _id: null,
                  totalImpressions: { $sum: "$impressions" },
                  totalClicks: { $sum: "$clicks" },
                  totalRevenue: { $sum: "$revenue" },
                  totalRequests: { $sum: "$totalRequests" },
                  avgCostPerClick: { $avg: "$costPerClick" },
                  matchRateWeightedSum: { $sum: { $multiply: ["$matchRate", "$totalRequests"] } },
                  matchRateTotalWeight: { $sum: "$totalRequests" },
                }
              });
              
              const totalsResult = await models?.DailyAdsManagerReport.aggregate(totalsPipeline);
              
              if (totalsResult && totalsResult.length > 0) {
                const totalsData = totalsResult[0];
                totals = {
                  impressions: totalsData.totalImpressions || 0,
                  clicks: totalsData.totalClicks || 0,
                  ctr: totalsData.totalImpressions > 0 
                    ? (totalsData.totalClicks / totalsData.totalImpressions) * 100 
                    : 0,
                  ecpm: totalsData.totalImpressions > 0 
                    ? (totalsData.totalRevenue / totalsData.totalImpressions) * 1000
                    : 0,
                  revenue: totalsData.totalRevenue || 0,
                  totalRequests: totalsData.totalRequests || 0,
                  costPerClick: totalsData.avgCostPerClick || 0,
                  matchRate: totalsData.matchRateTotalWeight > 0 
                  ? (totalsData.matchRateWeightedSum / totalsData.matchRateTotalWeight)
                  : 0,
                };
              }
            }

            resolve({
              totalDocs,
              totalPages,
              page,
              docs: facet.data || [],
              totals
            });

          } catch (error) {
            console.error("Error in getReports:", error);
            reject(error);
          }
        });
      }
    )
  },

  Mutation: {
    downloadDailyReportCSV: combineResolvers(
      isAuthenticated,
      async (parent, args, { models, me }, info) => {
        return new Promise(async (resolve, reject) => {
          try {
            // 🔎 Date filter
            let startDate = args?.startDate ? new Date(args.startDate) : null;
            startDate.setUTCHours(0, 0, 0, 0);
            let endDate = args?.endDate ? new Date(args.endDate) : null;
            endDate.setUTCHours(23, 59, 59, 999);

            // Build the base match stage for multiple sites
            const baseMatch = {
              isDeleted: false,
              $expr: {
                $and: [
                  { $gte: [{ $toDate: "$date" }, startDate] },
                  { $lte: [{ $toDate: "$date" }, endDate] }
                ]
              }
            };

            // Handle site validation more gracefully
            if (!args.site || (Array.isArray(args.site) && args.site.length === 0)) {
              // If user is admin, allow empty site to get all reports
              if (me?.isAdmin) {
                // Admin can see all reports without site filter
              } else {
                throw new Error("The `site` argument is required and cannot be empty.");
              }
            }

            // Add site filter based on whether it's single or multiple sites
            if (Array.isArray(args.site) && args.site.length > 0) {
              baseMatch.site = { $in: args.site };
            } else if (args.site) {
              baseMatch.site = args.site;
            }

            // 🛠️ Aggregation pipeline (same as getReports but without pagination)
            let aggregation = [
              { $match: baseMatch },
              { $sort: { date: -1 } }
            ];

            // ---------------------------
            // Case 1: No country filter or country = null
            // ---------------------------
            if (!args.country || args.country.length === 0 || args.country === null) {
              // Group by site and date (no country breakdown)
              const groupId = args.byDated
                ? { site: "$site", date: "$date" }
                : { site: "$site" };

              aggregation.push(
                {
                  $group: {
                    _id: groupId,
                    site: { $first: "$site" },
                    date: args.byDated ? { $first: "$date" } : { $min: "$date" },
                    impressions: { $sum: "$impressions" },
                    clicks: { $sum: "$clicks" },
                    revenue: { $sum: "$revenue" },
                    totalRequests: { $sum: "$totalRequests" },
                    costPerClick: { $avg: "$costPerClick" },
                    matchRateWeightedSum: { $sum: { $multiply: ["$matchRate", "$totalRequests"] } },
                    matchRateTotalWeight: { $sum: "$totalRequests" }
                  }
                },
                {
                  $project: {
                    site: 1,
                    date: {
                      $dateToString: {
                        format: "%m-%d-%Y",
                        date: { $ifNull: ["$date", new Date()] }
                      }
                    },
                    country: { $literal: "ALL" },
                    impressions: 1,
                    clicks: 1,
                    ctr: {
                      $cond: {
                        if: { $gt: ["$impressions", 0] },
                        then: { $multiply: [{ $divide: ["$clicks", "$impressions"] }, 100] },
                        else: 0
                      }
                    },
                    ecpm: {
                      $cond: {
                        if: { $gt: ["$impressions", 0] },
                        then: { $multiply: [{ $divide: ["$revenue", "$impressions"] }, 1000] },
                        else: 0
                      }
                    },
                    revenue: 1,
                    totalRequests: 1,
                    costPerClick: 1,
                    matchRate: {
                      $cond: {
                        if: { $gt: ["$matchRateTotalWeight", 0] },
                        then: { $divide: ["$matchRateWeightedSum", "$matchRateTotalWeight"] },
                        else: 0
                      }
                    }
                  }
                }
              );
            }
            // ---------------------------
            // Case 2 + 3: Country filter
            // ---------------------------
            else {
              // Convert countries object to array and unwind
              aggregation.push(
                {
                  $addFields: {
                    countriesArray: { $objectToArray: "$countries" }
                  }
                },
                { $unwind: "$countriesArray" }
              );

              // Case 3: Specific countries (not ALL)
              if (!(args.country.length === 1 && args.country[0] === "ALL")) {
                aggregation.push({
                  $match: { "countriesArray.k": { $in: args.country } }
                });
              }

              // Group by site, date, and country
              const countryGroupId = args.byDated
                ? { site: "$site", date: "$date", country: "$countriesArray.k" }
                : { site: "$site", country: "$countriesArray.k" };

              aggregation.push(
                {
                  $group: {
                    _id: countryGroupId,
                    site: { $first: "$site" },
                    date: args.byDated ? { $first: "$date" } : { $min: "$date" },
                    country: { $first: "$countriesArray.k" },
                    impressions: { $sum: "$countriesArray.v.impressions" },
                    clicks: { $sum: "$countriesArray.v.clicks" },
                    revenue: { $sum: "$countriesArray.v.revenue" },
                    totalRequests: { $sum: "$countriesArray.v.totalRequests" },
                    costPerClick: { $avg: "$countriesArray.v.costPerClick" },
                    matchRateWeightedSum: { $sum: { $multiply: ["$countriesArray.v.matchRate", "$countriesArray.v.totalRequests"] } },
                    matchRateTotalWeight: { $sum: "$countriesArray.v.totalRequests" }
                  }
                },
                {
                  $project: {
                    site: 1,
                    date: {
                      $dateToString: {
                        format: "%m-%d-%Y",
                        date: { $ifNull: ["$date", new Date()] }
                      }
                    },
                    country: "$country",
                    impressions: 1,
                    clicks: 1,
                    ctr: {
                      $cond: {
                        if: { $gt: ["$impressions", 0] },
                        then: { $multiply: [{ $divide: ["$clicks", "$impressions"] }, 100] },
                        else: 0
                      }
                    },
                    ecpm: {
                      $cond: {
                        if: { $gt: ["$impressions", 0] },
                        then: { $multiply: [{ $divide: ["$revenue", "$impressions"] }, 1000] },
                        else: 0
                      }
                    },
                    revenue: 1,
                    totalRequests: 1,
                    costPerClick: 1,
                    matchRate: {
                      $cond: {
                        if: { $gt: ["$matchRateTotalWeight", 0] },
                        then: { $divide: ["$matchRateWeightedSum", "$matchRateTotalWeight"] },
                        else: 0
                      }
                    }
                  }
                }
              );
            }

            // Final sorting
            aggregation.push(
              { $sort: { site: 1, date: -1, country: 1 } }
            );

            const result = await models?.DailyAdsManagerReport.aggregate(aggregation);

            // Transform data for CSV
            const csvData = result.map(item => ({
              site: item.site,
              date: item.date,
              country: item.country || "ALL",
              impressions: item.impressions || 0,
              clicks: item.clicks || 0,
              ctr: parseFloat(item.ctr?.toFixed(2)) || 0,
              ecpm: parseFloat(item.ecpm?.toFixed(2)) || 0,
              revenue: item.revenue || 0,
              totalRequests: item.totalRequests || 0,
              costPerClick: parseFloat(item.costPerClick?.toFixed(2)) || 0,
              matchRate: parseFloat(item.matchRate?.toFixed(2)) || 0
            }));

            // Create CSV string
            const headers = ['Site', 'Date', 'Country', 'Impressions', 'Clicks', 'CTR (%)', 'ECPM', 'Revenue', 'Total Requests', 'Cost Per Click', 'Match Rate'];
            const csvString = [
              headers.join(','),
              ...csvData.map(row => [
                `"${row.site}"`,
                `"${row.date}"`,
                `"${row.country}"`,
                row.impressions,
                row.clicks,
                row.ctr,
                row.ecpm,
                row.revenue,
                row.totalRequests,
                row.costPerClick,
                row.matchRate
              ].join(','))
            ].join('\n');

            // Calculate totals with weighted matchRate
            const totals = csvData.reduce((acc, row) => {
              acc.impressions += row.impressions;
              acc.clicks += row.clicks;
              acc.revenue += row.revenue;
              acc.totalRequests += row.totalRequests;
              acc.costPerClick += row.costPerClick;
              // Weighted matchRate calculation
              acc.matchRateWeightedSum += row.matchRate * row.totalRequests;
              acc.matchRateTotalWeight += row.totalRequests;
              return acc;
            }, {
              impressions: 0,
              clicks: 0,
              revenue: 0,
              totalRequests: 0,
              costPerClick: 0,
              matchRateWeightedSum: 0,
              matchRateTotalWeight: 0
            });

            // Calculate derived metrics
            totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
            totals.ecpm = totals.impressions > 0 ? (totals.revenue / totals.impressions) * 1000 : 0;
            totals.costPerClick = totals.clicks > 0 ? totals.costPerClick / csvData.length : 0;
            totals.matchRate = totals.matchRateTotalWeight > 0 ? (totals.matchRateWeightedSum / totals.matchRateTotalWeight) : 0;

            resolve({
              csvData: csvString,
              totalRecords: csvData.length,
              totals: {
                impressions: totals.impressions,
                clicks: totals.clicks,
                ctr: parseFloat(totals.ctr.toFixed(2)),
                ecpm: parseFloat(totals.ecpm.toFixed(2)),
                revenue: totals.revenue,
                totalRequests: totals.totalRequests,
                costPerClick: parseFloat(totals.costPerClick.toFixed(2)),
                matchRate: parseFloat(totals.matchRate.toFixed(2))
              }
            });

          } catch (error) {
            console.error("Error in downloadDailyReportCSV:", error);
            reject(error);
          }
        });
      }
    )
  }
};
