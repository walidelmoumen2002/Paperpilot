import arxiv
import re


def extract_arxiv_id(url: str) -> str | None:
    """Extracts the arXiv ID from a URL (abs or pdf)."""

    match = re.search(r"arxiv.org/(?:abs|pdf)/(\d+\.\d+)(?:v\d+)?", url)
    if match:
        return match.group(1)
    return None


def scrape_arxiv_data(url: str):
    paper_id = extract_arxiv_id(url)
    if not paper_id:
        raise ValueError("Invalid arXiv URL")

    client = arxiv.Client()
    search = arxiv.Search(id_list=[paper_id])

    try:
        paper = next(client.results(search))
        return {
            "title": paper.title,
            "abstract": paper.summary,
            "authors": [a.name for a in paper.authors],
            "published_at": paper.published,
            "pdf_url": paper.pdf_url,
            "arxiv_id": paper_id,
        }
    except StopIteration:
        raise ValueError("Paper not found on arXiv")
