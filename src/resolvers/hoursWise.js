import { combineResolvers } from "graphql-resolvers";
import { isAuthenticated } from "./authorization.js";
import moment from "moment";
import mongoose from "mongoose";

const ObjectId = mongoose.Types.ObjectId;

export default {
  Query: {
    getHoursWiseReports: combineResolvers(
      isAuthenticated,
      async (parent, args, { models, me }, info) => {
        return new Promise(async (resolve, reject) => {
          try {
            const page = Number(args.page) || 1;
            const limit = Number(args.limit) || 10;
            
            // Date filter
            let startDate = args?.startDate ? new Date(args.startDate) : null;
            startDate.setUTCHours(0, 0, 0, 0);
            let endDate = args?.endDate ? new Date(args.endDate) : null;
            endDate.setUTCHours(23, 59, 59, 999);

            // Build the base match stage
            const baseMatch = {
              isDeleted: false,
              hours: { $exists: true, $ne: null }, // Check hours exists and is not null
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

            // Add site filter
            if (Array.isArray(args.site) && args.site.length > 0) {
              baseMatch.site = { $in: args.site };
            } else if (args.site) {
              baseMatch.site = args.site;
            }


            const aggregation = [
              { $match: baseMatch },
              { $sort: { date: -1 } }
            ];

            // Convert hours object to array of key-value pairs
            aggregation.push({
              $addFields: {
                hoursArray: {
                  $objectToArray: "$hours"
                }
              }
            });

            // Unwind the hours array to flatten the data
            aggregation.push(
              { $unwind: { path: "$hoursArray", includeArrayIndex: "arrayIndex", preserveNullAndEmptyArrays: false } }
            );

            // Add hour index from the key
            aggregation.push({
              $addFields: {
                hourIndex: { $toInt: "$hoursArray.k" },
                hourData: "$hoursArray.v"
              }
            });

            // Determine grouping based on byDate parameter
            const groupId = { site: "$site", date: "$date", hourIndex: "$hourIndex" }

            aggregation.push(
              {
                $group: {
                  _id: groupId,
                  impressions: { $sum: "$hoursArray.v.impressions" },
                  clicks: { $sum: "$hoursArray.v.clicks" },
                  revenue: { $sum: "$hoursArray.v.revenue" },
                  totalRequests: { $sum: "$hoursArray.v.totalRequests" },
                  costPerClick: { $avg: "$hoursArray.v.costPerClick" },
                  matchRateWeightedSum: { $sum: { $multiply: ["$hoursArray.v.matchRate", "$hoursArray.v.totalRequests"] } },
                  matchRateTotalWeight: { $sum: "$hoursArray.v.totalRequests" },
                  date: { $first: "$date" },
                  site: { $first: "$site" },
                  hourIndex: { $first: "$hourIndex" }
                }
              },
              {
                $project: {
                  id: {
                    $cond: {
                      if: { $and: ["$site", "$date", { $ne: ["$hourIndex", null] }] },
                      then: { $concat: [
                        { $toString: "$site" }, 
                        "-", 
                        { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        "-HOUR-",
                        { $toString: "$hourIndex" }
                      ]},
                      else: { $concat: [
                        "fallback-",
                        { $toString: "$_id" }
                      ]}
                    }
                  },
                  site: 1,
                  date: { $dateToString: { format: "%m-%d-%Y", date: "$date" } },
                  hour: { $add: ["$hourIndex", 1] }, // Convert 0-based to 1-based hour
                  impressions: 1,
                  clicks: 1,
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
                  costPerClick: 1
                }
              }
            );

            // Final sorting and Pagination
            aggregation.push(
              { $sort: { site: 1, date: -1, hour: 1 } }
            );
            
            aggregation.push({
              $facet: {
                metadata: [{ $count: "total" }],
                data: [
                  { $skip: (page - 1) * limit },
                  { $limit: limit }
                ]
              }
            });
            
            const result = await models?.HourWise.aggregate(aggregation);
            
            const facet = result[0] || {};
            
            const totalDocs = facet.metadata[0]?.total || 0;
            const totalPages = Math.ceil(totalDocs / limit);
            

            // Calculate totals from all matching documents
            let totals = null;
            if (totalDocs > 0) {
              // Create a separate aggregation for totals calculation
              const totalsAggregation = [
                { $match: baseMatch },
                {
                  $addFields: {
                    hoursArray: { $objectToArray: "$hours" }
                  }
                },
                { $unwind: { path: "$hoursArray", preserveNullAndEmptyArrays: false } },
                {
                  $addFields: {
                    hourIndex: { $toInt: "$hoursArray.k" },
                    hourData: "$hoursArray.v"
                  }
                }
              ];

              // Apply same grouping logic for totals
              // if (args.byDated) {
                totalsAggregation.push({
                  $group: {
                    _id: { site: "$site", date: "$date", hourIndex: "$hourIndex" },
                    impressions: { $sum: "$hoursArray.v.impressions" },
                    clicks: { $sum: "$hoursArray.v.clicks" },
                    revenue: { $sum: "$hoursArray.v.revenue" },
                    totalRequests: { $sum: "$hoursArray.v.totalRequests" },
                    costPerClick: { $avg: "$hoursArray.v.costPerClick" },
                    matchRateWeightedSum: { $sum: { $multiply: ["$hoursArray.v.matchRate", "$hoursArray.v.totalRequests"] } },
                    matchRateTotalWeight: { $sum: "$hoursArray.v.totalRequests" }
                  }
                });
              // } else {
              //   totalsAggregation.push({
              //     $group: {
              //       _id: { site: "$site", hourIndex: "$hourIndex" },
              //       impressions: { $sum: "$hoursArray.v.impressions" },
              //       clicks: { $sum: "$hoursArray.v.clicks" },
              //       revenue: { $sum: "$hoursArray.v.revenue" },
              //       totalRequests: { $sum: "$hoursArray.v.totalRequests" },
              //       costPerClick: { $avg: "$hoursArray.v.costPerClick" },
              //       matchRateWeightedSum: { $sum: { $multiply: ["$hoursArray.v.matchRate", "$hoursArray.v.totalRequests"] } },
              //       matchRateTotalWeight: { $sum: "$hoursArray.v.totalRequests" }
              //     }
              //   });
              // }

              // Final totals aggregation
              totalsAggregation.push({
                $group: {
                  _id: null,
                  totalImpressions: { $sum: "$impressions" },
                  totalClicks: { $sum: "$clicks" },
                  totalRevenue: { $sum: "$revenue" },
                  totalRequests: { $sum: "$totalRequests" },
                  avgCostPerClick: { $avg: "$costPerClick" },
                  matchRateWeightedSum: { $sum: "$matchRateWeightedSum" },
                  matchRateTotalWeight: { $sum: "$matchRateTotalWeight" }
                }
              });
              
              const totalsResult = await models?.HourWise.aggregate(totalsAggregation);
              
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
            console.error("Error in getHoursWiseReports:", error);
            reject(error);
          }
        });
      }
    )
  }
};
