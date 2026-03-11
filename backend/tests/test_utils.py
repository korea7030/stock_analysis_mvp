# pyright: basic, reportMissingImports=false
from typing import Callable, cast

from backend.utils import normalize_number


def test_normalize_number_basic_cases() -> None:
    normalizer = cast(Callable[[str], float | None], normalize_number)
    assert normalizer("1,234") == 1234.0
    assert normalizer("(1,234)") == -1234.0
    assert normalizer("-") is None
    assert normalizer("") is None
