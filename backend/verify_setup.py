#!/usr/bin/env python
"""
SmartCity Dash - Backend Verification Script
Run this before starting the backend to verify all dependencies and config.
Usage: python verify_setup.py
"""

import sys
from pathlib import Path


def print_header(text):
    print(f"\n{'='*60}\n  {text}\n{'='*60}\n")


def check_python_version():
    print_header("1. Checking Python Version")
    v = sys.version_info
    print(f"   Python {v.major}.{v.minor}.{v.micro}")
    if v.major >= 3 and v.minor >= 9:
        print("   ✅ PASS: Python 3.9+\n")
        return True
    print("   ❌ FAIL: Need Python 3.9+\n")
    return False


def check_dependencies():
    print_header("2. Checking Dependencies")
    packages = [
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
        ("pydantic", "pydantic"),
        ("pydantic-settings", "pydantic_settings"),
        ("supabase", "supabase"),
        ("python-dotenv", "dotenv"),
        ("httpx", "httpx"),
    ]
    missing = []
    for name, imp in packages:
        try:
            __import__(imp)
            print(f"   ✅ {name}")
        except ImportError:
            print(f"   ❌ {name}")
            missing.append(name)
    if missing:
        print(f"\n   ❌ FAIL: pip install -r requirements.txt\n")
        return False
    print("\n   ✅ PASS: All dependencies installed\n")
    return True


def check_env_file():
    print_header("3. Checking .env Configuration")
    env_path = Path(".env")
    if not env_path.exists():
        print("   ❌ FAIL: .env file not found")
        print("   Run: cp .env.template .env\n")
        return False
    content = env_path.read_text()
    problems = []
    for var in ["SUPABASE_URL", "SUPABASE_KEY"]:
        if var not in content:
            problems.append(f"{var} missing")
        else:
            for line in content.splitlines():
                if line.startswith(f"{var}="):
                    val = line.split("=", 1)[1].strip()
                    if not val or "your-" in val:
                        problems.append(f"{var} not set to a real value")
    if problems:
        print("   ⚠️  .env exists but needs real credentials:")
        for p in problems:
            print(f"       • {p}")
        print()
        return False
    print("   ✅ PASS: .env configured\n")
    return True


def check_app_structure():
    print_header("4. Checking App Structure")
    files = [
        "app/__init__.py", "app/main.py", "app/models.py",
        "app/database.py", "app/config.py", "app/ai_gateway.py",
        "main.py", "requirements.txt", ".env.template", "supabase_setup.sql",
    ]
    ok = True
    for f in files:
        exists = Path(f).exists()
        print(f"   {'✅' if exists else '❌'} {f}")
        if not exists:
            ok = False
    print(f"\n   {'✅ PASS' if ok else '❌ FAIL'}: App structure\n")
    return ok


def check_supabase_connection():
    print_header("5. Checking Supabase Connection")
    try:
        from app.config import settings
        from app.database import SupabaseClient
        url = settings.supabase_url
        print(f"   URL: {url[:55]}{'...' if len(url) > 55 else ''}")
        client = SupabaseClient.get_client()
        client.table("drivers").select("id").limit(1).execute()
        print("   ✅ PASS: Connected to Supabase\n")
        return True
    except Exception as e:
        print(f"   ❌ FAIL: {e}")
        print("   Check SUPABASE_URL and SUPABASE_KEY in .env\n")
        return False


def main():
    print("\n" + "="*60)
    print("  SmartCity Dash Backend - Verification Script")
    print("="*60)

    checks = [
        ("Python Version", check_python_version),
        ("Dependencies", check_dependencies),
        ("Environment File", check_env_file),
        ("App Structure", check_app_structure),
        ("Supabase Connection", check_supabase_connection),
    ]

    results = {}
    for name, fn in checks:
        try:
            results[name] = fn()
        except Exception as e:
            print(f"   ❌ ERROR in {name}: {e}\n")
            results[name] = False

    print_header("Verification Summary")
    for name, ok in results.items():
        print(f"   {'✅ PASS' if ok else '❌ FAIL'}: {name}")

    passed = sum(results.values())
    total = len(results)
    print(f"\n   {passed}/{total} checks passed\n")

    if all(results.values()):
        print("   🎉 Ready! Run: python main.py\n")
        return 0
    print("   ⚠️  Fix issues above before starting.\n")
    return 1


if __name__ == "__main__":
    sys.exit(main())
