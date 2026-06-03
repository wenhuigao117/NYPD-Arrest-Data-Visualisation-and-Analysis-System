import requests
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, DoubleType

# ── 1. Init Spark ──────────────────────────────────────────────
spark = SparkSession.builder \
    .appName("NYC Arrest ETL Pipeline") \
    .master("local[*]") \
    .getOrCreate()
spark.sparkContext.setLogLevel("ERROR")

# ── 2. Ingest from NYC Open Data API ──────────────────────────
print("=== Step 1: Ingesting data from NYC Open Data API ===")
API_URL = "https://data.cityofnewyork.us/resource/uip8-fykc.json"
records = []
offset = 0
limit = 50000

while True:
    resp = requests.get(API_URL, params={"$limit": limit, "$offset": offset})
    batch = resp.json()
    if not batch:
        break
    records.extend(batch)
    offset += limit
    print(f"  Fetched {len(records)} records so far...")
    if len(batch) < limit:
        break

print(f"  Total ingested: {len(records)} records")

# ── 3. Create Spark DataFrame ──────────────────────────────────
print("\n=== Step 2: Creating Spark DataFrame ===")
# Remove nested geocoded_column that causes schema inference issues
for r in records:
    r.pop('geocoded_column', None)
df = spark.createDataFrame(records)
print(f"  Schema fields: {len(df.columns)}")
df.printSchema()

# ── 4. Data Quality Validation ────────────────────────────────
print("\n=== Step 3: Data Quality Validation ===")
total = df.count()
missing_age   = df.filter(F.col("age_group").isNull() | (F.col("age_group") == "(null)")).count()
missing_sex   = df.filter(F.col("perp_sex").isNull()  | (F.col("perp_sex")  == "(null)")).count()
missing_race  = df.filter(F.col("perp_race").isNull()).count()
missing_boro  = df.filter(F.col("arrest_boro").isNull()).count()

print(f"  Total records     : {total}")
print(f"  Missing age_group : {missing_age}  ({round(missing_age/total*100,2)}%)")
print(f"  Missing perp_sex  : {missing_sex}  ({round(missing_sex/total*100,2)}%)")
print(f"  Missing perp_race : {missing_race} ({round(missing_race/total*100,2)}%)")
print(f"  Missing boro      : {missing_boro} ({round(missing_boro/total*100,2)}%)")

# ── 5. Transform & Clean ──────────────────────────────────────
print("\n=== Step 4: Transforming and Cleaning ===")
BORO_MAP = {"M": "Manhattan", "K": "Brooklyn", "Q": "Queens", "B": "Bronx", "S": "Staten Island"}
boro_map_expr = F.create_map([F.lit(k) for pair in BORO_MAP.items() for k in pair])

df_clean = df.select(
    F.col("arrest_key"),
    F.to_date(F.col("arrest_date")).alias("arrest_date"),
    boro_map_expr[F.col("arrest_boro")].alias("borough"),
    F.col("arrest_precinct").cast("int").alias("precinct"),
    F.lower(F.col("law_cat_cd")).alias("law_category"),
    F.when(F.col("age_group").isNull() | (F.col("age_group") == "(null)"), "Unknown")
     .otherwise(F.col("age_group")).alias("age_group"),
    F.when(F.col("perp_sex").isNull() | (F.col("perp_sex") == "(null)"), "Unknown")
     .otherwise(F.col("perp_sex")).alias("gender"),
    F.when(F.col("perp_race").isNull(), "Unknown")
     .otherwise(F.col("perp_race")).alias("race"),
    F.col("ofns_desc").alias("offense"),
    F.month(F.to_date(F.col("arrest_date"))).alias("month"),
    F.year(F.to_date(F.col("arrest_date"))).alias("year"),
) .filter(F.col("borough").isNotNull())

print(f"  Clean records: {df_clean.count()}")

# ── 6. Aggregations ───────────────────────────────────────────
print("\n=== Step 5: Aggregations ===")

print("\n  [Borough Distribution]")
df_clean.groupBy("borough").count() \
    .orderBy(F.desc("count")).show()

print("\n  [Top 10 Offenses]")
df_clean.groupBy("offense").count() \
    .orderBy(F.desc("count")).limit(10).show(truncate=False)

print("\n  [Monthly Trend]")
df_clean.groupBy("year", "month").count() \
    .orderBy("year", "month").show()

print("\n  [Law Category Breakdown]")
df_clean.groupBy("law_category").count() \
    .orderBy(F.desc("count")).show()

print("\n  [Age Group Distribution]")
df_clean.groupBy("age_group").count() \
    .orderBy(F.desc("count")).show()

print("\n  [Gender Distribution]")
df_clean.groupBy("gender").count() \
    .orderBy(F.desc("count")).show()

# ── 7. Save outputs ───────────────────────────────────────────
print("\n=== Step 6: Saving outputs ===")
df_clean.write.mode("overwrite").parquet("output/arrests_clean.parquet")
df_clean.groupBy("borough", "law_category").count() \
    .write.mode("overwrite").csv("output/borough_offense_summary.csv", header=True)
print("  Saved: output/arrests_clean.parquet")
print("  Saved: output/borough_offense_summary.csv")

spark.stop()
print("\n=== Pipeline complete ===")
