from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import SQLITE_URL

engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def auto_migrate_sqlite():
    """Ensure SQLite schema has all required columns dynamically without data loss."""
    with engine.connect() as conn:
        # Check users table
        try:
            res = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            existing_cols = {row[1] for row in res}
            if existing_cols:
                user_cols = {
                    "phone": "TEXT",
                    "ckyc": "TEXT",
                    "aadhaar_last4": "TEXT",
                    "pan": "TEXT",
                    "nominee_name": "TEXT",
                    "nominee_relation": "TEXT",
                    "nominee_phone": "TEXT",
                    "member_tier": "TEXT",
                    "digilocker_synced": "BOOLEAN DEFAULT 1",
                    "mparivahan_synced": "BOOLEAN DEFAULT 1",
                    "abha_synced": "BOOLEAN DEFAULT 1",
                    "nicr_synced": "BOOLEAN DEFAULT 1",
                }
                for col, col_type in user_cols.items():
                    if col not in existing_cols:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
                conn.commit()
        except Exception as e:
            pass

        # Check claims table
        try:
            res = conn.execute(text("PRAGMA table_info(claims)")).fetchall()
            existing_cols = {row[1] for row in res}
            if existing_cols:
                claim_cols = {
                    "user_id": "TEXT",
                    "damages": "JSON",
                    "ai_analysis": "JSON",
                    "documents": "JSON",
                    "timeline": "JSON"
                }
                for col, col_type in claim_cols.items():
                    if col not in existing_cols:
                        conn.execute(text(f"ALTER TABLE claims ADD COLUMN {col} {col_type}"))
                conn.commit()
        except Exception as e:
            pass
