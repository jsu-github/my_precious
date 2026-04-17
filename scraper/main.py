"""
Holland Gold price scraper — main entry point.

Usage:
    python main.py

Environment variables:
    API_BASE_URL   Base URL of the Precious Dashboard API.
                   Default: http://localhost:4001
    DEALER_NAME    Exact dealer name to update.
                   Default: HollandGold

Scheduling (cron expression — Mon–Fri, 3× per day):
    0 9,13,17 * * 1-5  python /path/to/scraper/main.py

Exit codes:
    0  Success
    1  Scraping failure (site unreachable, all products missing)
    2  API failure (dealer not found, HTTP error)
"""

import logging
import os
import sys

import requests

from scraper import scrape_prices

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:4001")
DEALER_NAME = os.getenv("DEALER_NAME", "HollandGold")


def main() -> int:
    logger.info("=== HollandGold price scraper starting ===")

    # ------------------------------------------------------------------
    # Step 1: Scrape prices from hollandgold.nl
    # ------------------------------------------------------------------
    try:
        prices = scrape_prices()
    except Exception as exc:
        logger.error("Scraping failed with unexpected error: %s", exc, exc_info=True)
        return 1

    if not prices:
        logger.error("No prices could be extracted — aborting without updating DB")
        return 1

    logger.info("Extracted %d price(s): %s", len(prices), prices)

    # ------------------------------------------------------------------
    # Step 2: Locate the dealer record via the API
    # ------------------------------------------------------------------
    try:
        resp = requests.get(f"{API_BASE_URL}/api/dealers", timeout=10)
        resp.raise_for_status()
        dealers: list[dict] = resp.json()
    except requests.RequestException as exc:
        logger.error("Failed to fetch dealers from API (%s): %s", API_BASE_URL, exc)
        return 2

    dealer = next((d for d in dealers if d["name"] == DEALER_NAME), None)
    if dealer is None:
        logger.error(
            "Dealer '%s' not found in database — "
            "create it via the UI before running the scraper",
            DEALER_NAME,
        )
        return 2

    logger.info("Found dealer '%s' (id=%s)", dealer["name"], dealer["id"])

    # ------------------------------------------------------------------
    # Step 3: Update only the prices we successfully scraped.
    # Non-scraped fields are omitted so existing DB values are preserved
    # (Knex ignores undefined fields in UPDATE).
    # ------------------------------------------------------------------
    payload = {"name": dealer["name"], **prices}

    try:
        resp = requests.put(
            f"{API_BASE_URL}/api/dealers/{dealer['id']}",
            json=payload,
            timeout=10,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        logger.error("Failed to update dealer prices: %s", exc)
        return 2

    updated = resp.json()
    logger.info(
        "Updated %s successfully — we_buy_gold_per_gram=%.4f  updated_at=%s",
        DEALER_NAME,
        float(updated.get("we_buy_gold_per_gram") or 0),
        updated.get("updated_at", "—"),
    )
    logger.info("=== Done ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
