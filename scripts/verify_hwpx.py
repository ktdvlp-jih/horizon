import glob
import re
import zipfile
from pathlib import Path

paths = [p for p in Path("docs").glob("*.hwpx") if "공고" not in p.name]
assert paths, "no plan hwpx"
p = paths[0]
print("path:", p)
with zipfile.ZipFile(p) as z:
    xml = z.read("Contents/section0.xml").decode("utf-8")
    header = z.read("Contents/header.xml").decode("utf-8")
texts = re.findall(r"<hp:t[^>]*>(.*?)</hp:t>", xml, re.DOTALL)
for i, t in enumerate(texts[:12]):
    t = re.sub(r"<[^>]+>", "", t)
    print(f"{i+1}. {t[:90]}")
print("total hp:t", len(texts))
print("ends ok:", xml.strip().endswith("</hs:sec>"))
m = re.search(r'lang="HANGUL".*?face="([^"]+)"', header, re.DOTALL)
print("hangul font:", m.group(1) if m else "?")
