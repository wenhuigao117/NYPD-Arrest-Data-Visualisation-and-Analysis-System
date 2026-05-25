import { ObjectId } from "mongodb";
import { arrests } from "../config/mongoCollections.js";
import {
  checkId,
  checkString,
  checkNumber,
} from "../data/utils.js";

const createArrest = async (
  arrest_date,
  borough,
  precinct,
  offense_description,
  law_category,
  age_group,
  gender,
  race,
  latitude,
  longitude
) => {
  if (
    !arrest_date ||
    !borough ||
    precinct === undefined ||
    !offense_description ||
    !law_category ||
    !age_group ||
    !gender ||
    !race
  )
    throw "Error: all fields must be provided";

  arrest_date = checkString(arrest_date, "arrest_date");

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(arrest_date)) {
    throw "Error: arrest_date must be in YYYY-MM-DD format";
  }

  const dateObj = new Date(arrest_date);

  if (isNaN(dateObj.getTime())) {
    throw "Error: arrest_date is not a valid date";
  }

  const today = new Date();
  if (dateObj > today) {
    throw "Error: arrest_date cannot be in the future";
  }

  borough = checkString(borough, "borough");
  const validBoroughs = ["B", "S", "K", "M", "Q"];
  if (!validBoroughs.includes(borough.toUpperCase())) {
    throw "Error: borough must be one of B, S, K, M, Q";
  }

  offense_description = checkString(offense_description, "offense_description");

  law_category = checkString(law_category, "law_category");
  const validLevels = ["felony", "misdemeanor", "violation"];
  if (!validLevels.includes(law_category.toLowerCase())) {
    throw "Error: law_category must be felony, misdemeanor, or violation";
  }

  age_group = checkString(age_group, "age_group");

  const validAgeGroups = ["<18", "18-24", "25-44", "45-64", "65+", "null"];
  if (!validAgeGroups.includes(age_group)) {
    throw "Error: age_group must be one of <18, 18-24, 25-44, 45-64, 65+, null";
  }

  race = checkString(race, "race");
  const validRaces = [
    "WHITE",
    "WHITE HISPANIC",
    "BLACK",
    "BLACK HISPANIC",
    "ASIAN / PACIFIC ISLANDER",
    "AMERICAN INDIAN / ALASKAN NATIVE",
    "UNKNOWN"
  ];

  if (!validRaces.includes(race.toUpperCase())) {
    throw "Error: invalid race value";
  }

  precinct = checkNumber(precinct, "precinct");
  if (precinct < 1 || precinct > 123) {
    throw "Error: precinct must be a valid precinct number (1-123)";
  }

  gender = checkString(gender, "gender");
  const validGenders = ["M", "F", "U"];
  if (!validGenders.includes(gender.toUpperCase())) {
    throw "Error: gender must be 'M', 'F', or 'U'";
  }

  if (latitude !== undefined && latitude !== null) {
    latitude = checkNumber(latitude, "latitude");
    if (latitude < -90 || latitude > 90) throw "Error: invalid latitude";
  } else latitude = null;

  if (longitude !== undefined && longitude !== null) {
    longitude = checkNumber(longitude, "longitude");
    if (longitude < -180 || longitude > 180) throw "Error: invalid longitude";
  } else longitude = null;

  const arrestCollection = await arrests();

  const newArrest = {
    _id: new ObjectId(),
    arrest_date,
    borough,
    precinct,
    offense_description,
    law_category,
    age_group,
    gender,
    race,
    arrest_location: {
      latitude,
      longitude
    }
  };

  const insertInfo = await arrestCollection.insertOne(newArrest);
  if (!insertInfo.acknowledged || !insertInfo.insertedId)
    throw "Error: could not add arrest record";

  const inserted = await arrestCollection.findOne({
    _id: insertInfo.insertedId
  });

  inserted._id = inserted._id.toString();
  return inserted;
};

const getAllArrests = async (page = 1, limit = 50) => {
  const arrestCollection = await arrests();

  const skip = (page - 1) * limit;

  const totalCount = await arrestCollection.countDocuments();
  const totalPages = Math.ceil(totalCount / limit);

  const arrestsData = await arrestCollection
    .find({})
    .skip(skip)
    .limit(limit)
    .toArray();

  return {
    arrests: arrestsData.map((a) => ({ ...a, _id: a._id.toString() })),
    currentPage: page,
    totalPages: totalPages,
    totalCount: totalCount,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

const getArrestById = async (id) => {
  id = checkId(id, "id");

  const arrestCollection = await arrests();
  const arrest = await arrestCollection.findOne({ _id: new ObjectId(id) });

  if (!arrest) throw "Error: no arrest found with the given id";

  arrest._id = arrest._id.toString();
  return arrest;
};

const removeArrest = async (id) => {
  id = checkId(id, "id");

  const arrestCollection = await arrests();
  const deletionInfo = await arrestCollection.deleteOne({
    _id: new ObjectId(id)
  });

  if (deletionInfo.deletedCount === 0)
    throw `Error: could not delete arrest with id of ${id}`;

  return { deleted: true };
};

const getArrestsByFilter = async (filters = {}) => {
  const arrestCollection = await arrests();
  const query = {};

  if (filters.borough) query.borough = checkString(filters.borough, "borough");
  if (filters.precinct !== undefined && filters.precinct !== "") {
    const p = Number(filters.precinct);
    if (isNaN(p) || p < 1 || p > 123) throw "Invalid precinct";
    query.precinct = p;
  }
  if (filters.offense_description)
    query.offense_description = checkString(filters.offense_description, "offense_description");
  if (filters.law_category)
    query.law_category = checkString(filters.law_category, "law_category");
  if (filters.age_group)
    query.age_group = checkString(filters.age_group, "age_group");
  if (filters.gender)
    query.gender = checkString(filters.gender, "gender");
  if (filters.race)
    query.race = checkString(filters.race, "race");

  const results = await arrestCollection.find(query).toArray();
  return results.map((a) => ({ ...a, _id: a._id.toString() }));
};

const searchArrests = async (keyword) => {
  keyword = checkString(keyword, "keyword");
  const arrestCollection = await arrests();

  const results = await arrestCollection
    .find({
      $or: [
        { offense_description: { $regex: keyword, $options: "i" } },
        { law_category: { $regex: keyword, $options: "i" } }
      ]
    })
    .toArray();

  return results.map((a) => ({ ...a, _id: a._id.toString() }));
};

const getCrimeRanking = async (limit = 10) => {
  const arrestCollection = await arrests();
  const totalCount = await arrestCollection.countDocuments({});
  const pipeline = [
    {
      $group: {
        _id: {
          offense: '$offense_description',
          lawCategory: '$law_category'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.offense',
        count: { $sum: '$count' },
        lawCategory: { $first: '$_id.lawCategory' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        offense: '$_id',
        count: 1,
        lawCategory: 1
      }
    }
  ];

  const agg = await arrestCollection.aggregate(pipeline).toArray();

  return agg.map(item => ({
    offense: item.offense || 'Unknown',
    count: item.count || 0,
    lawCategory: (item.lawCategory || 'Unknown').toLowerCase(),
    percentage: totalCount > 0
      ? ((item.count / totalCount) * 100).toFixed(2)
      : '0.00'
  }));
};

const getDemographicData = async () => {
  try {
    const arrestCollection = await arrests();
    const arrestData = await arrestCollection.find({}).toArray();

    if (!arrestData || arrestData.length === 0) {
      return {
        ageGroupData: { labels: [], values: [] },
        genderData: { labels: [], values: [] },
        raceData: { labels: [], values: [] },
        boroughDemographicData: { labels: [], age18_25: [], age25_45: [], age45plus: [] },
        ageGenderData: { labels: [], male: [], female: [] },
        raceBoroughData: { labels: [], black: [], white: [], hispanic: [], asian: [] },
        total: 0
      };
    }

    const ageGroups = {};
    const genderStats = {};
    const raceStats = {};
    const boroughDemo = {};
    const ageGender = {};
    const raceBoroughs = {};

    arrestData.forEach(arrest => {
      const ageGroupRaw = arrest.age_group || 'Unknown';
      const ageGroup = String(ageGroupRaw).trim() || 'Unknown';
      ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;

      const gender = (arrest.gender || 'Unknown').toString().trim();
      genderStats[gender] = (genderStats[gender] || 0) + 1;

      const race = (arrest.race || 'Unknown').toString().trim();
      raceStats[race] = (raceStats[race] || 0) + 1;

      const borough = (arrest.borough || 'Unknown').toString().trim();
      if (!boroughDemo[borough]) {
        boroughDemo[borough] = { age18_25: 0, age25_45: 0, age45plus: 0 };
      }
      if (ageGroup.includes('18') || ageGroup.includes('18-')) boroughDemo[borough].age18_25++;
      else if (ageGroup.includes('25') || ageGroup.includes('25-') || ageGroup.includes('25-44')) boroughDemo[borough].age25_45++;
      else if (ageGroup.includes('45') || ageGroup.includes('65') || ageGroup.includes('+')) boroughDemo[borough].age45plus++;

      const agKey = ageGroup;
      if (!ageGender[agKey]) ageGender[agKey] = { male: 0, female: 0 };
      const g = gender.toUpperCase();
      if (g === 'M' || g === 'MALE') ageGender[agKey].male++;
      else if (g === 'F' || g === 'FEMALE') ageGender[agKey].female++;

      if (!raceBoroughs[borough]) raceBoroughs[borough] = { black: 0, white: 0, hispanic: 0, asian: 0 };
      const r = race.toUpperCase();
      if (r.includes('BLACK')) raceBoroughs[borough].black++;
      else if (r.includes('WHITE')) raceBoroughs[borough].white++;
      else if (r.includes('HISPANIC')) raceBoroughs[borough].hispanic++;
      else if (r.includes('ASIAN')) raceBoroughs[borough].asian++;
    });

    return {
      ageGroupData: {
        labels: Object.keys(ageGroups),
        values: Object.values(ageGroups)
      },
      genderData: {
        labels: Object.keys(genderStats),
        values: Object.values(genderStats)
      },
      raceData: {
        labels: Object.keys(raceStats),
        values: Object.values(raceStats)
      },
      boroughDemographicData: {
        labels: Object.keys(boroughDemo),
        age18_25: Object.values(boroughDemo).map(b => b.age18_25),
        age25_45: Object.values(boroughDemo).map(b => b.age25_45),
        age45plus: Object.values(boroughDemo).map(b => b.age45plus)
      },
      ageGenderData: {
        labels: Object.keys(ageGender),
        male: Object.values(ageGender).map(ag => ag.male),
        female: Object.values(ageGender).map(ag => ag.female)
      },
      raceBoroughData: {
        labels: Object.keys(raceBoroughs),
        black: Object.values(raceBoroughs).map(rb => rb.black),
        white: Object.values(raceBoroughs).map(rb => rb.white),
        hispanic: Object.values(raceBoroughs).map(rb => rb.hispanic),
        asian: Object.values(raceBoroughs).map(rb => rb.asian)
      },
      total: arrestData.length
    };
  } catch (e) {
    throw `Error: could not get demographic data - ${e}`;
  }
};

export {
  createArrest,
  getAllArrests,
  getArrestById,
  removeArrest,
  getArrestsByFilter,
  searchArrests,
  getCrimeRanking,
  getDemographicData
};
// FIX Bug 3: added sort support
// sortField: arrest_date | offense_description | borough | law_category
// sortOrder: asc | desc
export const getSortedArrests = async (page = 1, limit = 50, sortField = 'arrest_date', sortOrder = 'desc') => {
  const arrestCollection = await arrests();
  const skip = (page - 1) * limit;

  const validSortFields = ['arrest_date', 'offense_description', 'borough', 'law_category'];
  if (!validSortFields.includes(sortField)) sortField = 'arrest_date';
  const sortDir = sortOrder === 'asc' ? 1 : -1;

  const totalCount = await arrestCollection.countDocuments();
  const totalPages = Math.ceil(totalCount / limit);

  const arrestsData = await arrestCollection
    .find({})
    .sort({ [sortField]: sortDir })
    .skip(skip)
    .limit(limit)
    .toArray();

  return {
    arrests: arrestsData.map((a) => ({ ...a, _id: a._id.toString() })),
    currentPage: page,
    totalPages,
    totalCount,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    sortField,
    sortOrder
  };
};

export const searchAndSortArrests = async (keyword, sortField = 'arrest_date', sortOrder = 'desc') => {
  keyword = checkString(keyword, "keyword");
  const arrestCollection = await arrests();

  const validSortFields = ['arrest_date', 'offense_description', 'borough', 'law_category'];
  if (!validSortFields.includes(sortField)) sortField = 'arrest_date';
  const sortDir = sortOrder === 'asc' ? 1 : -1;

  const results = await arrestCollection
    .find({
      $or: [
        { offense_description: { $regex: keyword, $options: "i" } },
        { law_category: { $regex: keyword, $options: "i" } }
      ]
    })
    .sort({ [sortField]: sortDir })
    .toArray();

  return results.map((a) => ({ ...a, _id: a._id.toString() }));
};
