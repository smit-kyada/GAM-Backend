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
          if (!args.site || (Array.isArray(args.site) && args.site.length === 0)) {
            throw new Error("The `site` argument is required and cannot be empty.");
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
  }
};
