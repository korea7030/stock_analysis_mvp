import re

def normalize_number(text):
    """
    Convert financial numbers into float.
    Handles parentheses = negative, scale 6 (millions), commas, dash, blanks.
    """
    if not text or text in ["—", "-", ""]:
        return None

    # Detect negative via ( 123 )
    negative = "(" in text and ")" in text

    cleaned = re.sub(r"[^0-9.]", "", text)
    if cleaned == "":
        return None

    try:
        val = float(cleaned)
        if negative:
            val = -val
        return val
    except:
        return None