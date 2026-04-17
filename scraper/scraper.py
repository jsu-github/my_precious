"""
Holland Gold buyback price scraper.

Extracts per-gram buyback prices from hollandgold.nl for 6 metal/product
categories and returns them as a dict keyed by dealer DB column name.

Each category is resolved by navigating to the relevant sub-page and
locating a known reference product in the rendered page text.  Multiple
fallback products are tried in order; the first match wins.

Dutch price format: €12.879,11  →  period = thousands sep, comma = decimal.
"""

import logging
import re
from typing import Optional

from playwright.sync_api import Page, TimeoutError as PWTimeout, sync_playwright

logger = logging.getLogger(__name__)

BASE_URL = "https://www.hollandgold.nl"

# ---------------------------------------------------------------------------
# Reference products
# Tuple layout: (url_path, [(product_name, fine_weight_grams), ...])
# For direct per-gram products (Pt/Pd "per gram in opslag") weight = 1.0.
# ---------------------------------------------------------------------------
REFERENCE_PRODUCTS: list[tuple[str, str, list[tuple[str, float]]]] = [
    (
        "we_buy_gold_per_gram",
        "/verkopen/goudbaren.html",
        [
            # Direct per-gram product — weight = 1 g
            ("C. Hafner 1 gram goudbaar", 1.0),
            ("Umicore 1 gram goudbaar", 1.0),
            ("Goud per gram in verzekerde opslag", 1.0),
        ],
    ),
    (
        "we_buy_gold_1oz_bar_per_gram",
        "/verkopen/goudbaren.html",
        [
            # 1-troy-oz gold bars (31.1035 g) — most common portfolio bar size
            ("C. Hafner 1 troy ounce goudbaar", 31.1035),
            ("Umicore 1 troy ounce goudbaar", 31.1035),
            ("Argor Heraeus 1 troy ounce goudbaar", 31.1035),
        ],
    ),
    (
        "we_buy_gold_50g_bar_per_gram",
        "/verkopen/goudbaren.html",
        [
            # 50 g gold bars
            ("C. Hafner 50 gram goudbaar", 50.0),
            ("Umicore 50 gram goudbaar", 50.0),
            ("Argor Heraeus 50 gram goudbaar", 50.0),
        ],
    ),
    (
        "we_buy_gold_100g_bar_per_gram",
        "/verkopen/goudbaren.html",
        [
            # 100 g gold bars
            ("C. Hafner 100 gram goudbaar", 100.0),
            ("Umicore 100 gram goudbaar", 100.0),
            ("Argor Heraeus 100 gram goudbaar", 100.0),
        ],
    ),
    (
        "we_buy_gold_coin_per_gram",
        "/verkopen/gouden-munten.html",
        [
            # 1-troy-oz gold coins; fine Au = 31.1035 g
            # Full names as rendered on page (suffix ensures no nav-link false match)
            ("Maple Leaf 1 troy ounce gouden munt - diverse jaartallen", 31.1035),
            ("Krugerrand 1 troy ounce gouden munt - diverse jaartallen", 31.1035),
            ("Britannia 1 troy ounce gouden munt - diverse jaartallen", 31.1035),
            ("Philharmoniker 1 troy ounce gouden munt - diverse jaartallen", 31.1035),
        ],
    ),
    (
        "we_buy_silver_bar_per_gram",
        "/verkopen/zilverbaren.html",
        [
            # Direct per-gram product (insured storage rate — generic fallback)
            ("Zilver per gram in verzekerde opslag btw-vrij Zwitserland", 1.0),
        ],
    ),
    (
        "we_buy_silver_100oz_bar_per_gram",
        "/verkopen/zilverbaren.html",
        [
            # 100 troy oz physical silver bar (3110.35 g)
            ("Zilverbaar 100 troy ounce btw-vrij Zwitserland", 3110.35),
        ],
    ),
    (
        "we_buy_silver_coin_per_gram",
        "/verkopen/zilveren-munten.html",
        [
            # 1-troy-oz silver coins; fine Ag = 31.1035 g
            ("Krugerrand 1 troy ounce zilveren munt - diverse jaartallen", 31.1035),
            ("Maple Leaf 1 troy ounce zilveren munt - diverse jaartallen", 31.1035),
            ("Britannia 1 troy ounce zilveren munt - diverse jaartallen", 31.1035),
        ],
    ),
    (
        "we_buy_platinum_per_gram",
        "/verkopen/platina-palladium.html",
        [
            # Direct per-gram product
            ("Platina per gram in verzekerde opslag", 1.0),
        ],
    ),
    (
        "we_buy_palladium_per_gram",
        "/verkopen/platina-palladium.html",
        [
            ("Palladium per gram in verzekerde opslag", 1.0),
        ],
    ),
]


def _extract_price(text: str, product_name: str) -> Optional[float]:
    """Find the buyback price for *product_name* in rendered page body text.

    The DOM renders prices split across lines:
        €\n127,\n54       →  127.54
        €\n1.275,\n36    →  1275.36

    Searches within 300 chars after the product name.
    Returns None when not found.
    """
    pattern = re.compile(
        re.escape(product_name) + r"[^€]{0,300}€\s*([\d\.]+),\s*(\d{2})",
        re.DOTALL | re.IGNORECASE,
    )
    match = pattern.search(text)
    if not match:
        return None
    int_part = match.group(1).replace(".", "")  # strip thousands separator
    return float(int_part + "." + match.group(2))


def _load_page(page: Page, url: str, cache: dict[str, str]) -> Optional[str]:
    """Load *url* (with networkidle wait) and return the body text.

    Results are cached so the Pt/Pd sub-page is only fetched once even
    though both platinum and palladium prices are extracted from it.
    Returns None on timeout.
    """
    if url in cache:
        return cache[url]

    logger.info("Loading %s", url)
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        page.wait_for_load_state("networkidle", timeout=15_000)
    except PWTimeout:
        logger.warning("Timeout loading %s", url)
        return None

    text = page.inner_text("body")
    cache[url] = text
    return text


def scrape_prices() -> dict[str, float]:
    """Scrape HollandGold buyback prices and return per-gram rates.

    Returns a dict of ``{column_name: price_per_gram}`` for every category
    where a reference product was successfully located.  Missing categories
    are omitted — callers should merge with existing DB values rather than
    overwriting everything.
    """
    prices: dict[str, float] = {}

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        page_text_cache: dict[str, str] = {}

        for field, url_path, candidates in REFERENCE_PRODUCTS:
            url = BASE_URL + url_path
            text = _load_page(page, url, page_text_cache)

            if text is None:
                logger.warning("Skipping %s — page failed to load", field)
                continue

            found = False
            for product_name, weight_g in candidates:
                raw_price = _extract_price(text, product_name)
                if raw_price is None:
                    logger.debug("  '%s' not found on %s", product_name, url)
                    continue

                per_gram = round(raw_price / weight_g, 4)
                logger.info("  %-30s  €%.4f/g  (via '%s')", field, per_gram, product_name)
                prices[field] = per_gram
                found = True
                break

            if not found:
                logger.warning(
                    "No candidate product found for %s on %s — field will not be updated",
                    field,
                    url,
                )

        browser.close()

    return prices
