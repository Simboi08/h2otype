# English word pools

`english.json` contains 1,000 distinct lowercase words. The first 100 are a
curated basic-English pool; the larger 500/1,000-word pools expand it with
original everyday words and common words from [Darius Kazemi's Corpora](https://github.com/dariusk/corpora/blob/master/data/words/common.json).
These are common-word practice sets, not an exact frequency ranking or a copy
of Monkeytype's lists. The extra words were filtered to ASCII letters with a
maximum length of 14, deduplicated, and ordered deterministically.

Corpora is released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
From its [license statement](https://github.com/dariusk/corpora#license):

> To the extent possible under law, Darius Kazemi has waived all copyright and
> related or neighboring rights to Corpora. This work is published from:
> United States.

The data is bundled locally. Playing does not fetch a remote word service.
