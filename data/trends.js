import { arrests } from "../config/mongoCollections.js";

const exportedMethods = {
  // Monthly trends grouped by YYYY-MM
  async getMonthlyTrends() {
    const arrestCollection = await arrests();

    const pipeline = [
      // only keeping docs where arrest_date is str

      {
        $match: {
          arrest_date: { $type: "string" }
        }
      },

      // parse "YYYY-MM-DD" - date object
      {
        $project: {
          arrestDateObj: {
            $dateFromString: { dateString: "$arrest_date" }
          }
        }
      }, 

      // group by year + month
      {
        $group: {
          _id: {
            year: { $year: "$arrestDateObj" },
            month: { $month: "$arrestDateObj" }
          },
          totalArrests: { $sum: 1 }
        }
      },

      // sorting chronologically
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1
        }
      },

      // format month label as "YYYY-MM"
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $cond: [
                  { $lt: ["$_id.month", 10] },
                  { $concat: ["0", { $toString: "$_id.month" }] },
                  { $toString: "$_id.month" }
                ]
              }
            ]
          },
          totalArrests: 1
        }
      }
    ];

    const results = await arrestCollection.aggregate(pipeline).toArray();

    // already in { month, totalArrests } shape, but keep map for safety
    return results.map(r => ({
      month: r.month,
      totalArrests: r.totalArrests
    }));
  },
  
  // weekly trends - kept as-is, just left here for completeness
  async getWeeklyTrends() {
    const arrestCollection = await arrests();

    const pipeline = [
      {
        $project: {
          week: {
            $isoWeek: {
              $dateFromString: { dateString: "$arrest_date" }
            }
          },
          year: {
            $year: {
              $dateFromString: { dateString: "$arrest_date" }
            }
          }
        }
      },
      {
        $group: {
          _id: { year: "$year", week: "$week" },
          totalArrests: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } }
    ];

    const results = await arrestCollection.aggregate(pipeline).toArray();

    return results.map((r) => ({
      year: r._id.year,
      week: r._id.week,
      totalArrests: r.totalArrests
    }));
  }
};

export default exportedMethods;