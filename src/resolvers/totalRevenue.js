import { combineResolvers } from "graphql-resolvers";
import { isAuthenticated } from "./authorization.js";
import moment from "moment";

export default {
  Query: {
    getTotalRevenueData: combineResolvers(
      isAuthenticated,
      async (parent, args, { models, me }, info) => {
        return new Promise(async (resolve, reject) => {
          try {
            // Default to last 45 days if not specified
            const days = args.days || 45;
            
            // Calculate date range
            const endDate = moment().endOf('day').toDate();
            const startDate = moment().subtract(days - 1, 'days').startOf('day').toDate();

            // Build match criteria
            let matchCriteria = {
              isDeleted: false,
              date: {
                $gte: startDate,
                $lte: endDate
              }
            };

            if (!args.sites || (Array.isArray(args.sites) && args.sites.length === 0)) {
              throw new Error("The `site` argument is required and cannot be empty.");
            }

            // Add site filter if provided
            if (Array.isArray(args.sites) && args.sites.length > 0) {
              matchCriteria.site = { $in: args.sites };
            } else if (args.sites) {
              matchCriteria.site = args.sites;
            }

            // Aggregation pipeline to get date-wise revenue data
            const aggregationPipeline = [
              { $match: matchCriteria },
              {
                $group: {
                  _id: {
                    date: {
                      $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$date"
                      }
                    }
                  },
                  totalRevenue: { $sum: "$revenue" },
                  totalImpressions: { $sum: "$impressions" },
                  totalClicks: { $sum: "$clicks" },
                  totalRequests: { $sum: "$totalRequests" },
                  avgCostPerClick: { $avg: "$costPerClick" },
                  matchRateWeightedSum: { 
                    $sum: { 
                      $multiply: ["$matchRate", "$totalRequests"] 
                    } 
                  },
                  matchRateTotalWeight: { $sum: "$totalRequests" },
                  sites: { $addToSet: "$site" }
                }
              },
              {
                $project: {
                  date: "$_id.date",
                  totalRevenue: 1,
                  totalImpressions: 1,
                  totalClicks: 1,
                  totalRequests: 1,
                  ctr: {
                    $cond: {
                      if: { $gt: ["$totalImpressions", 0] },
                      then: { $multiply: [{ $divide: ["$totalClicks", "$totalImpressions"] }, 100] },
                      else: 0
                    }
                  },
                  ecpm: {
                    $cond: {
                      if: { $gt: ["$totalImpressions", 0] },
                      then: { $multiply: [{ $divide: ["$totalRevenue", "$totalImpressions"] }, 1000] },
                      else: 0
                    }
                  },
                  costPerClick: { $ifNull: ["$avgCostPerClick", 0] },
                  matchRate: {
                    $cond: {
                      if: { $gt: ["$matchRateTotalWeight", 0] },
                      then: { $divide: ["$matchRateWeightedSum", "$matchRateTotalWeight"] },
                      else: 0
                    }
                  },
                  siteCount: { $size: "$sites" },
                  sites: 1
                }
              },
              { $sort: { date: 1 } }
            ];

            // Execute aggregation
            const dailyData = await models.AdUnitReport.aggregate(aggregationPipeline);

            // Calculate summary totals
            const summaryAggregation = [
              { $match: matchCriteria },
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: "$revenue" },
                  totalImpressions: { $sum: "$impressions" },
                  totalClicks: { $sum: "$clicks" },
                  totalRequests: { $sum: "$totalRequests" },
                  avgCostPerClick: { $avg: "$costPerClick" },
                  matchRateWeightedSum: { 
                    $sum: { 
                      $multiply: ["$matchRate", "$totalRequests"] 
                    } 
                  },
                  matchRateTotalWeight: { $sum: "$totalRequests" },
                  uniqueDates: { $addToSet: {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$date"
                    }
                  }}
                }
              },
              {
                $project: {
                  totalRevenue: 1,
                  totalImpressions: 1,
                  totalClicks: 1,
                  totalRequests: 1,
                  averageCtr: {
                    $cond: {
                      if: { $gt: ["$totalImpressions", 0] },
                      then: { $multiply: [{ $divide: ["$totalClicks", "$totalImpressions"] }, 100] },
                      else: 0
                    }
                  },
                  averageEcpm: {
                    $cond: {
                      if: { $gt: ["$totalImpressions", 0] },
                      then: { $multiply: [{ $divide: ["$totalRevenue", "$totalImpressions"] }, 1000] },
                      else: 0
                    }
                  },
                  averageCostPerClick: { $ifNull: ["$avgCostPerClick", 0] },
                  averageMatchRate: {
                    $cond: {
                      if: { $gt: ["$matchRateTotalWeight", 0] },
                      then: { $divide: ["$matchRateWeightedSum", "$matchRateTotalWeight"] },
                      else: 0
                    }
                  },
                  totalDays: { $size: "$uniqueDates" }
                }
              }
            ];

            const summaryResult = await models.AdUnitReport.aggregate(summaryAggregation);
            const summary = summaryResult[0] || {
              totalRevenue: 0,
              totalImpressions: 0,
              totalClicks: 0,
              totalRequests: 0,
              averageCtr: 0,
              averageEcpm: 0,
              averageCostPerClick: 0,
              averageMatchRate: 0,
              totalDays: 0
            };

            // Add date range to summary
            summary.dateRange = `${moment(startDate).format('MMM DD, YYYY')} - ${moment(endDate).format('MMM DD, YYYY')}`;

            resolve({
              summary,
              dailyData
            });

          } catch (error) {
            console.error("❌ Error in getTotalRevenueData:", error);
            reject(error);
          }
        });
      }
    )
  }
};
