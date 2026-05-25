// seed.js placeholder inside tasks folder
// seed.js
// Database seeding script for NYC Arrest Data
// Fetches data from NYC Open Data API and performs stratified sampling
// to ensure balanced representation across all boroughs, age groups, and offense types

import {dbConnection, closeConnection} from '../config/mongoConnection.js';
import {arrests, users, comments} from '../config/mongoCollections.js';
import bcrypt from 'bcryptjs';

// Configuration
const API_URL = 'https://data.cityofnewyork.us/resource/uip8-fykc.json';
const SAMPLE_SIZE = 1000;
const SAMPLES_PER_BOROUGH = 400; // changed this from 200 to 400 (so the total records would be around 2000 for 5 boroughs)

// Main seeding function
const main = async () => {
  // Connect to database and drop existing data
  const db = await dbConnection();
  console.log('Connected to database');
  
  await db.dropDatabase();
  console.log('Dropped existing database');

  try {
    // Step 1: Fetch arrest data from NYC Open Data API
    console.log('\n=== Step 1: Fetching arrest data from NYC Open Data API ===');
    const arrestData = await fetchArrestData();
    console.log(`Fetched ${arrestData.length} arrest records`);

    // Step 2: Perform stratified sampling by borough
    console.log('\n=== Step 2: Performing stratified sampling ===');
    const sampledData = stratifiedSampleByBorough(arrestData, SAMPLES_PER_BOROUGH);
    console.log(`Sampled ${sampledData.length} records (${SAMPLES_PER_BOROUGH} per borough)`);

    // Step 3: Transform and clean data
    console.log('\n=== Step 3: Transforming and cleaning data ===');
    const cleanedData = sampledData.map(transformArrestRecord);
    console.log(`Cleaned ${cleanedData.length} records`);

    // Step 4: Insert arrests into database
    console.log('\n=== Step 4: Inserting arrests into database ===');
    const arrestsCollection = await arrests();
    const insertResult = await arrestsCollection.insertMany(cleanedData);
    console.log(`Inserted ${insertResult.insertedCount} arrest records`);

    // Step 5: Create test users
    console.log('\n=== Step 5: Creating test users ===');
    await seedTestUsers();

    // Step 6: Create sample comments
    console.log('\n=== Step 6: Creating sample comments ===');
    await seedSampleComments();

    console.log('\n=== Done seeding database ===');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await closeConnection();
    console.log('Database connection closed');
  }
};

// Fetch arrest data from NYC Open Data API
// Now fetches ALL pages (in 50k chunks) so we cover months up to the latest date
async function fetchArrestData() {
  try {
    const limit = 50000;
    let offset = 0;
    let allData = [];

    // CHANGE: Added pagination loop — previously API returned only first 50k rows.
    // Now we keep fetching until the API stops returning records.
    while (true) {
      const url = `${API_URL}?$limit=${limit}&$offset=${offset}`;
      console.log(`Fetching data from: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const batch = await response.json();

      // CHANGE: Stop when API returns an empty batch (meaning no more pages)
      if (!batch || batch.length === 0) {
        break;
      }

      allData = allData.concat(batch);

      // CHANGE: If the batch is smaller than limit, we've reached the last page
      if (batch.length < limit) {
        break;
      }

      // CHANGE: Increase offset to fetch next 50k chunk
      offset += limit;
    }

    if (!allData.length) {
      throw new Error('No data received from API');
    }

    console.log(`Total records fetched from API: ${allData.length}`);
    return allData;
  } catch (error) {
    console.error('Error fetching data from API:', error);

    // Fallback: generate sample data if API fails - unchanged logic
    console.log('Falling back to generated sample data...');
    return generateSampleData();
  }
}


// Perform stratified sampling by borough
// Ensures each borough (M, K, Q, B, S) has equal representation
// This prevents bias toward boroughs with more arrest records
function stratifiedSampleByBorough(data, samplesPerBorough) {
  // Group records by borough
  const byBorough = {
    M: [], // Manhattan
    K: [], // Brooklyn
    Q: [], // Queens
    B: [], // Bronx
    S: []  // Staten Island
  };

  // Separate records into borough groups
  data.forEach(record => {
    const borough = record.arrest_boro;
    if (byBorough[borough]) {
      byBorough[borough].push(record);
    }
  });

  // Log counts per borough before sampling
  console.log('Records per borough before sampling:');
  for (const [borough, records] of Object.entries(byBorough)) {
    console.log(`  ${borough}: ${records.length} records`);
  }

  // Sample from each borough
  const samples = [];
  for (const [borough, records] of Object.entries(byBorough)) {
    if (records.length > 0) {
      const boroughSamples = randomSample(records, samplesPerBorough);
      samples.push(...boroughSamples);
      console.log(`  Sampled ${boroughSamples.length} records from borough ${borough}`);
    } else {
      console.log(`  Warning: No records found for borough ${borough}`);
    }
  }

  return samples;
}

// Random sampling function using Fisher-Yates shuffle algorithm
// Returns n random items from the array without replacement
function randomSample(array, n) {
  // If array is smaller than n, return the whole array
  if (array.length <= n) {
    return [...array];
  }

  // Fisher-Yates shuffle
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, n);
}

// Transform API record to match our database schema
// Handles field name mapping and data type conversions
function transformArrestRecord(record) {
  return {
    arrest_date: record.arrest_date || new Date().toISOString().split('T')[0],
    borough: (record.arrest_boro || 'M').toUpperCase(),
    precinct: parseInt(record.arrest_precinct) || 1,
    offense_description: record.ofns_desc || 'UNKNOWN OFFENSE',
    law_category: (record.law_cat_cd || 'misdemeanor').toLowerCase(),
    age_group: record.age_group || 'null',
    gender: (record.perp_sex || 'U').toUpperCase(),
    race: (record.perp_race || 'UNKNOWN').toUpperCase(),
    arrest_location: {
      latitude: parseFloat(record.latitude) || null,
      longitude: parseFloat(record.longitude) || null
    }
  };
}

// Generate sample data as fallback if API is unavailable
// Creates realistic arrest records with balanced distribution
function generateSampleData() {
  console.log('Generating sample data...');
  
  const boroughs = ['M', 'K', 'Q', 'B', 'S'];
  const offenses = [
    'ASSAULT 3',
    'PETIT LARCENY',
    'ROBBERY',
    'BURGLARY',
    'GRAND LARCENY',
    'CRIMINAL MISCHIEF',
    'DRUG POSSESSION',
    'DANGEROUS WEAPONS',
    'TRAFFIC VIOLATION',
    'HARASSMENT'
  ];
  const lawCategories = ['felony', 'misdemeanor', 'violation'];
  const ageGroups = ['<18', '18-24', '25-44', '45-64', '65+'];
  const genders = ['M', 'F'];
  const races = [
    'WHITE',
    'BLACK',
    'WHITE HISPANIC',
    'BLACK HISPANIC',
    'ASIAN / PACIFIC ISLANDER',
    'AMERICAN INDIAN / ALASKAN NATIVE'
  ];

  const sampleData = [];
  
  // Generate 10000 records (enough for stratified sampling)
  for (let i = 0; i < 10000; i++) {
    const borough = boroughs[Math.floor(Math.random() * boroughs.length)];
    
    sampleData.push({
      arrest_date: generateRandomDate(),
      arrest_boro: borough,
      arrest_precinct: Math.floor(Math.random() * 123) + 1,
      ofns_desc: offenses[Math.floor(Math.random() * offenses.length)],
      law_cat_cd: lawCategories[Math.floor(Math.random() * lawCategories.length)],
      age_group: ageGroups[Math.floor(Math.random() * ageGroups.length)],
      perp_sex: genders[Math.floor(Math.random() * genders.length)],
      perp_race: races[Math.floor(Math.random() * races.length)],
      latitude: generateRandomLatitude(),
      longitude: generateRandomLongitude()
    });
  }

  return sampleData;
}

// Generate random date within the past year
function generateRandomDate() {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

// Generate random latitude for NYC area (40.5 to 40.9)
function generateRandomLatitude() {
  return 40.5 + Math.random() * 0.4;
}

// Generate random longitude for NYC area (-74.3 to -73.7)
function generateRandomLongitude() {
  return -74.3 + Math.random() * 0.6;
}

// Seed test users for development and testing
// Creates real team member accounts and test users with hashed passwords
async function seedTestUsers() {
  const usersCollection = await users();
  
  const testUsers = [
    // Team member: Wenhui Gao (Infrastructure Lead)
    {
      username: 'wenhuigao',
      email: 'gwhb070802@gmail.com',
      password: await bcrypt.hash('Wenhui2025!', 10),
      createdAt: new Date(),
      favorites: [],
      comments: []
    },
    // Generic test user for development
    {
      username: 'testuser',
      email: 'test@example.com',
      password: await bcrypt.hash('Password123@', 10),
      createdAt: new Date(),
      favorites: [],
      comments: []
    },
    // Admin user for testing privileged operations
    {
      username: 'admin',
      email: 'admin@example.com',
      password: await bcrypt.hash('Admin123&', 10),
      createdAt: new Date(),
      favorites: [],
      comments: []
    }
  ];

  const insertResult = await usersCollection.insertMany(testUsers);
  console.log(`Created ${insertResult.insertedCount} test users`);
  console.log('  - wenhuigao / Wenhui2025！');
  console.log('  - testuser (P password23@)');
  console.log('  - admin (Admin123&)');
  
  return insertResult;
}

// Seed sample comments linking users to arrest records
// Creates realistic comments for testing the comment system
async function seedSampleComments() {
  const usersCollection = await users();
  const arrestsCollection = await arrests();
  const commentsCollection = await comments();

  // Get test users
  const allUsers = await usersCollection.find({}).toArray();
  if (allUsers.length === 0) {
    console.log('No users found, skipping comment seeding');
    return;
  }

  // Get some arrests
  const someArrests = await arrestsCollection.find({}).limit(10).toArray();
  if (someArrests.length === 0) {
    console.log('No arrests found, skipping comment seeding');
    return;
  }

  // Sample comments
  const sampleComments = [
    'This is concerning for our neighborhood safety.',
    'I hope the authorities are taking appropriate action.',
    'We need more community policing in this area.',
    'Thanks for sharing this data.',
    'Important to stay informed about local crime.',
    'This highlights the need for better prevention programs.',
    'Glad to see transparency in law enforcement data.',
    'We should analyze these trends more carefully.',
    'Community awareness is key to improving safety.',
    'Appreciate the detailed information.'
  ];

  const commentsToInsert = [];
  
  // Create 10 sample comments
  for (let i = 0; i < Math.min(10, someArrests.length); i++) {
    const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
    const randomArrest = someArrests[i];
    
    commentsToInsert.push({
      userId: randomUser._id,
      arrestId: randomArrest._id,
      text: sampleComments[i],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  if (commentsToInsert.length > 0) {
    const insertResult = await commentsCollection.insertMany(commentsToInsert);
    console.log(`Created ${insertResult.insertedCount} sample comments`);
  }
}

// Run the seeding script
main().catch(console.error);