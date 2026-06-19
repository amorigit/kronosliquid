#!/usr/bin/env python3
"""Resolve Wikimedia Commons thumbnail URLs for watch/commodity images."""

import json
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (compatible; Kronos/1.0)"
API = "https://commons.wikimedia.org/w/api.php"

FILES = {
    "ROLEX-SUB-PERP": "File:Rolex-Submariner.jpg",
    "ROLEX-DAYTONA-PERP": "File:Rolex Daytona Cosmograph.jpg",
    "ROLEX-GMT-PERP": "File:Rolex GMT Master II - 16710 in it sitting on top of the box.jpg",
    "PATEK-NAUTILUS-PERP": "File:Patek-Philippe-Nautilus-5711.jpg",
    "PP-ANNUAL-PERP": "File:Patek Philippe Annual Calendar 5205G.jpg",
    "PP-AQUANAUT-PERP": "File:Patek Philippe Aquanaut 5167A.jpg",
    "AP-ROYAL-OAK-PERP": "File:Audemars Piguet Royal Oak ref. 15202.jpg",
    "AP-OFFSHORE-PERP": "File:Royal Oak Offshore watch by Audemars Piguet.JPG",
    "AP-CODE-PERP": "File:Audemars Piguet Code 11.59.jpg",
    "OMEGA-SPEEDY-PERP": "File:Omega Speedmaster Schumacher Edition (kombi).jpg",
    "OMEGA-SEAMASTER-PERP": "File:Omega Seamaster Professional 300M.jpg",
    "CARTIER-SANTOS-PERP": "File:Cartier Santos wristwatch.jpg",
    "CARTIER-TANK-PERP": "File:Cartier Tank watch.jpg",
    "RM-11-PERP": "File:Richard Mille RM 011.jpg",
    "VC-OVERSEAS-PERP": "File:Vacheron Constantin Overseas.jpg",
    "IWC-PILOT-PERP": "File:IWC Big Pilot watch.jpg",
    "TAG-CARRERA-PERP": "File:TAG Heuer Carrera watch.jpg",
    "HUBLOT-BB-PERP": "File:Hublot Big Bang watch.jpg",
    "JLC-REVERSO-PERP": "File:Jaeger-LeCoultre Reverso watch.jpg",
    "PANERAI-LUM-PERP": "File:Panerai Luminor watch.jpg",
    "BREITLING-NAV-PERP": "File:Breitling Navitimer watch.jpg",
    "GOLD-PERP": "File:Gold bullion.jpg",
    "SILVER-PERP": "File:Silver bullion.jpg",
    "PLATINUM-PERP": "File:Platinum ingot.jpg",
    "DIAMOND-PERP": "File:Brilliant cut diamond.jpg",
    "WL500-PERP": "File:Luxury watches.jpg",
}

PEXELS_FALLBACK = {
    "WL500-PERP": 190819,
    "GOLD-PERP": 1040945,
    "SILVER-PERP": 298863,
    "PLATINUM-PERP": 291762,
    "DIAMOND-PERP": 1300556,
    "ROLEX-SUB-PERP": 190819,
    "PATEK-NAUTILUS-PERP": 2783873,
    "AP-ROYAL-OAK-PERP": 997910,
    "OMEGA-SPEEDY-PERP": 280918,
    "CARTIER-SANTOS-PERP": 1152077,
    "RM-11-PERP": 2430383,
    "VC-OVERSEAS-PERP": 277390,
    "IWC-PILOT-PERP": 1454227,
    "TAG-CARRERA-PERP": 2929994,
    "ROLEX-DAYTONA-PERP": 3254763,
    "PP-ANNUAL-PERP": 2783873,
    "AP-OFFSHORE-PERP": 437037,
    "OMEGA-SEAMASTER-PERP": 1779001643179,  # placeholder, overwritten below
    "CARTIER-TANK-PERP": 1152077,
    "HUBLOT-BB-PERP": 2430383,
    "JLC-REVERSO-PERP": 277390,
    "PANERAI-LUM-PERP": 1779001643179,
    "BREITLING-NAV-PERP": 1454227,
    "ROLEX-GMT-PERP": 3254763,
    "PP-AQUANAUT-PERP": 2783873,
    "AP-CODE-PERP": 997910,
}

UNSPLASH = {
    "ROLEX-SUB-PERP": "photo-1670404160620-a3a86428560e",
    "ROLEX-DAYTONA-PERP": "photo-1551816230-ef5deaed4a26",
    "ROLEX-GMT-PERP": "photo-1670404160620-a3a86428560e",
    "OMEGA-SEAMASTER-PERP": "photo-1779001643179-b162d33d4ee4",
    "PANERAI-LUM-PERP": "photo-1779001643179-b162d33d4ee4",
}


def pexels_url(pid: int) -> str:
    return (
        f"https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg"
        f"?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop"
    )


def unsplash_url(photo: str) -> str:
    return f"https://images.unsplash.com/{photo}?auto=format&fit=crop&w=400&h=400&q=80"


def wiki_thumb(title: str) -> str | None:
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "titles": title,
            "prop": "imageinfo",
            "iiprop": "url",
            "iiurlwidth": 400,
            "format": "json",
        }
    )
    req = urllib.request.Request(f"{API}?{params}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.load(resp)
    page = next(iter(data["query"]["pages"].values()))
    if "imageinfo" not in page:
        return None
    info = page["imageinfo"][0]
    return info.get("thumburl") or info.get("url")


def main() -> None:
    out = {}
    for market_id, title in FILES.items():
        url = None
        try:
            url = wiki_thumb(title)
        except Exception:
            url = None
        if not url and market_id in UNSPLASH:
            url = unsplash_url(UNSPLASH[market_id])
        if not url and market_id in PEXELS_FALLBACK:
            pid = PEXELS_FALLBACK[market_id]
            if isinstance(pid, int):
                url = pexels_url(pid)
        out[market_id] = url
        status = "ok" if url else "MISSING"
        print(f"{status}\t{market_id}\t{url or title}")

    print("\nJSON:")
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
