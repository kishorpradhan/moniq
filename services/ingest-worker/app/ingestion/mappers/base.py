from typing import Iterable


class BaseMapper:
    name = "base"

    def matches(self, headers: Iterable[str]) -> bool:
        raise NotImplementedError

    def map_row(self, row: dict):
        raise NotImplementedError
