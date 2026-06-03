# NYC Arrest Data ETL Pipeline

A PySpark-based ETL pipeline that ingests, validates, transforms, and aggregates 69,000+ NYC arrest records from the NYC Open Data API.

## Pipeline Steps
1. **Ingest** — Fetches all records from NYC Open Data API with pagination
2. **Validate** — Data quality checks for missing values and encoding anomalies
3. **Transform** — Cleans null values, maps borough codes, normalizes fields
4. **Aggregate** — Borough distribution, offense rankings, monthly trends, demographics
5. **Export** — Outputs cleaned data as Parquet and summary as CSV

## Key Findings
- 69,305 records across Jan–Mar 2026
- Brooklyn has highest arrest volume (21,111)
- Top offense: Assault 3 & Related Offenses (9,415)
- 24.4% missing age/gender data flagged and handled

## Tech Stack
- PySpark 4.1.2
- NYC Open Data API (NYPD Arrest Data)
- Output: Parquet + CSV
