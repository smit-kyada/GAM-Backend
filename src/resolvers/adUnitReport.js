import { combineResolvers } from "graphql-resolvers";
import { isAuthenticated } from "./authorization.js";
import moment from "moment";
import mongoose from "mongoose";

const ObjectId = mongoose.Types.ObjectId;

export default {
  Query: {
    getAdUnitReports: combineResolvers(
      isAuthenticated,
      async (parent, args, { models, me }, info) => {
        return new Promise(async (resolve, reject) => {
          try {
            // 🚨 Site validation
            if (!args.site || args.site === null || args.site === undefined) {
              throw new Error("Site parameter is required and cannot be null");
            }

            // Handle multiple sites if provided as array
            let siteFilter;
            if (Array.isArray(args.site)) {
              if (args.site.length === 0) {
                throw new Error("Site array cannot be empty");
              }
              siteFilter = { $in: args.site };
            } else {
              siteFilter = args.site;
            }

            let Obj = {};
            const page = Number(args.page) || 1;
            const limit = Number(args.limit) || 10;

            // 🔎 Filters
            Obj.site = siteFilter;
            // Note: siteId is not in the GraphQL schema, removing this filter
            // if (args?.siteId) Obj.siteId = ObjectId(args.siteId);
            Obj.isDeleted = false;

            // 🔎 Date filter
            let startDate = args?.startDate ? new Date(args.startDate) : null;
            if (startDate) {
              startDate.setUTCHours(0, 0, 0, 0);
            }
            let endDate = args?.endDate ? new Date(args.endDate) : null;
            if (endDate) {
              endDate.setUTCHours(23, 59, 59, 999);
            }

            if (startDate && endDate) {
              Obj.$expr = {
                $and: [
                  { $gte: [{ $toDate: "$date" }, startDate] },
                  { $lte: [{ $toDate: "$date" }, endDate] }
                ]
              };
            } else if (startDate) {
              Obj.$expr = {
                $gte: [{ $toDate: "$date" }, startDate]
              };
            } else if (endDate) {
              Obj.$expr = {
                $lte: [{ $toDate: "$date" }, endDate]
              };
            }

            // 🛠️ Aggregation pipeline
            let aggregation = [
              { $match: Obj },
              { $sort: { date: -1 } }
            ];

            // ---------------------------
            // Case 1: No country filter or country = null
            // ---------------------------

            if (!args.country || args.country.length === 0 || args.country === null) {

              // Convert adUnits object to array and unwind
              aggregation.push(
                {
                  $addFields: {
                    adUnitsArray: {
                      $cond: {
                        if: { $isArray: "$adUnits" },
                        then: {
                          $map: {
                            input: "$adUnits",
                            as: "adUnit",
                            in: {
                              k: "$$adUnit.name",
                              v: "$$adUnit"
                            }
                          }
                        },
                        else: { $objectToArray: "$adUnits" }
                      }
                    }
                  }
                },
                { $unwind: "$adUnitsArray" }
              );

              // Group by adUnit to aggregate adUnit data (without countries)
              const groupId = args.byDated
                ? { site: "$site", date: "$date", adUnitName: "$adUnitsArray.k" }
                : { site: "$site", adUnitName: "$adUnitsArray.k" };

              aggregation.push(
                {
                  $group: {
                    _id: groupId,
                    site: { $first: "$site" },
                    date: args.byDated ? { $first: "$date" } : { $min: "$date" },
                    adUnitName: { $first: "$adUnitsArray.k" },
                    impressions: { $sum: "$adUnitsArray.v.impressions" },
                    clicks: { $sum: "$adUnitsArray.v.clicks" },
                    revenue: { $sum: "$adUnitsArray.v.revenue" },
                    totalRequests: { $sum: "$adUnitsArray.v.totalRequests" },
                    costPerClick: { $avg: "$adUnitsArray.v.costPerClick" },
                    matchRateWeightedSum: { $sum: { $multiply: ["$adUnitsArray.v.matchRate", "$adUnitsArray.v.totalRequests"] } },
                    matchRateTotalWeight: { $sum: "$adUnitsArray.v.totalRequests" }
                  }
                },
                {
                  $project: {
                    id: {
                      $cond: {
                        if: { $and: ["$_id.site", "$_id.adUnitName", "$date"] },
                        then: {
                          $concat: [
                            { $toString: "$_id.site" },
                            "-",
                            { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                            "-",
                            "$_id.adUnitName"
                          ]
                        },
                        else: {
                          $concat: [
                            { $toString: { $ifNull: ["$_id.site", "unknown"] } },
                            "-",
                            { $dateToString: { format: "%Y-%m-%d", date: { $ifNull: ["$date", new Date()] } } },
                            "-",
                            { $ifNull: ["$_id.adUnitName", "unknown"] }
                          ]
                        }
                      }
                    },
                    site: 1,
                    date: {
                      $dateToString: {
                        format: "%m-%d-%Y",
                        date: { $ifNull: ["$date", new Date()] }
                      }
                    },
                    adUnitName: "$adUnitName",
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
                    // No country field included
                  }
                }
              );
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
                    impressions: 1,
                    clicks: 1,
                    revenue: 1,
                    totalRequests: 1,
                    costPerClick: 1,
                    matchRate: 1,
                    adUnits: {
                      $map: {
                        input: { $objectToArray: "$adUnits" },
                        as: "adUnit",
                        in: {
                          name: "$$adUnit.k",
                          countries: {
                            $map: {
                              input: { $objectToArray: "$$adUnit.v.countries" },
                              as: "c",
                              in: { country: "$$c.k", stats: "$$c.v" }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                { $unwind: "$adUnits" },
                { $unwind: "$adUnits.countries" }
              );

              // Case 3: Specific countries (not ALL)
              if (!(args.country.length === 1 && args.country[0] === "ALL")) {
                aggregation.push({
                  $match: { "adUnits.countries.country": { $in: args.country } }
                });
              }
              // Determine grouping based on byDate parameter for country filter
              const countryGroupId = args.byDated
                ? { site: "$site", adUnitName: "$adUnits.name", country: "$adUnits.countries.country", date: "$date" }
                : { site: "$site", adUnitName: "$adUnits.name", country: "$adUnits.countries.country" };

              aggregation.push(
                {
                  $group: {
                    _id: countryGroupId,
                    impressions: { $sum: "$adUnits.countries.stats.impressions" },
                    clicks: { $sum: "$adUnits.countries.stats.clicks" },
                    revenue: { $sum: "$adUnits.countries.stats.revenue" },
                    totalRequests: { $sum: "$adUnits.countries.stats.totalRequests" },
                    costPerClick: { $avg: "$adUnits.countries.stats.costPerClick" },
                    matchRateWeightedSum: { $sum: { $multiply: ["$adUnits.countries.stats.matchRate", "$adUnits.countries.stats.totalRequests"] } },
                    matchRateTotalWeight: { $sum: "$adUnits.countries.stats.totalRequests" },
                    site: { $first: "$site" },
                    adUnitName: { $first: "$adUnits.name" },
                    country: { $first: "$adUnits.countries.country" },
                    date: args.byDated ? { $first: "$date" } : { $min: "$date" }
                  }
                },
                {
                  $project: {
                    id: {
                      $concat: [
                        { $toString: { $ifNull: ["$_id.site", "unknown"] } },
                        "-",
                        { $dateToString: { format: "%Y-%m-%d", date: { $ifNull: ["$date", new Date()] } } },
                        "-",
                        { $ifNull: ["$_id.adUnitName", "unknown"] }
                      ]
                    },
                    site: 1,
                    date: {
                      $dateToString: {
                        format: "%m-%d-%Y",
                        date: { $ifNull: ["$date", new Date()] }
                      }
                    },
                    adUnitName: "$adUnitName",
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
                    },
                    country: 1
                  }
                }
              );
            }

            // Add pagination
            aggregation.push(
              {
                $facet: {
                  metadata: [{ $count: "total" }],
                  data: [
                    { $skip: (page - 1) * limit },
                    { $limit: limit }
                  ]
                }
              }
            );

            // First, let's check if there's any data at all for this site and date range
            const testMatch = await models?.AdUnitReport.find({
              site: args.site,
              isDeleted: false,
              $expr: {
                $and: [
                  { $gte: [{ $toDate: "$date" }, startDate] },
                  { $lte: [{ $toDate: "$date" }, endDate] }
                ]
              }
            }).limit(1);

            const result = await models?.AdUnitReport.aggregate(aggregation);
            const facet = result[0] || {};

            const totalDocs = facet.metadata[0]?.total || 0;
            const totalPages = Math.ceil(totalDocs / limit);

            // Calculate totals from all matching documents
            let totals = null;
            if (totalDocs > 0) {
              const totalsAggregation = [...aggregation];
              const totalsPipeline = totalsAggregation.filter(stage =>
                !stage.$facet && !stage.$skip && !stage.$limit
              );

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

              const totalsResult = await models?.AdUnitReport.aggregate(totalsPipeline);

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
