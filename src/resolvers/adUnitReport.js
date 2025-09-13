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
            let Obj = {};
            const page = Number(args.page) || 1;
            const limit = Number(args.limit) || 10;

            // 🔎 Filters
            if (args?.site) Obj.site = args.site;
            if (args?.siteId) Obj.siteId = ObjectId(args.siteId);
            Obj.isDeleted = false;

            // 🔎 Date filter
            let startDate = args?.startDate ? new Date(args.startDate) : null;
            startDate.setUTCHours(0, 0, 0, 0);
            let endDate = args?.endDate ? new Date(args.endDate) : null;
            endDate.setUTCHours(23, 59, 59, 999);

            if (startDate && endDate) {
              Obj.date = { $gte: startDate, $lte: endDate };
            } else if (startDate) {
              Obj.date = { $gte: startDate };
            } else if (endDate) {
              Obj.date = { $lte: endDate };
            }

            // 🛠️ Aggregation pipeline
            let aggregation = [
              { $match: Obj },
              { $sort: { date: -1 } },
              {
                $project: {
                  id: "$_id",
                  site: 1,
                  date: 1,
                  impressions: 1,
                  clicks: 1,
                  ctr: 1,
                  ecpm: 1,
                  revenue: 1,
                  totalRequests: 1,
                  costPerClick: 1,
                  matchRate: 1,
                }
              },
              {
                $facet: {
                  metadata: [{ $count: "total" }],
                  data: [
                    { $skip: (page - 1) * limit },
                    { $limit: limit }
                  ],
                  // you can keep your other facets (last7DaysTotal, etc.)
                }
              }
            ];

            const result = await models?.AdUnitReport.aggregate(aggregation);
            const facet = result[0] || {};

            const totalDocs = facet.metadata[0]?.total || 0;
            const totalPages = Math.ceil(totalDocs / limit);

            resolve({
              totalDocs,
              totalPages,
              page,
              docs: facet.data || []
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
