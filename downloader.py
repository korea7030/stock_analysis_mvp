from sec_downloader import Downloader
import sec_parser as sp

import tempfile
import os

def print_first_n_lines(text: str, *, n: int):
    print("\n".join(text.split("\n")[:n]), "...", sep="\n")

dl = Downloader("PersonalProject", "korea7030.jhl@gmail.com")
html = dl.get_filing_html(ticker="AAPL", form="10-Q")

if isinstance(html, bytes):
    html = html.decode("utf-8", errors="ignore")

elements: list = sp.Edgar10QParser().parse(html)
demo_output: str = sp.render(elements)

print_first_n_lines(demo_output, n=7)

    
