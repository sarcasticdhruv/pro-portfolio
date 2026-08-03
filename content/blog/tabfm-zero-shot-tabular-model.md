---
title: "TabFM: Google's Zero-Shot Foundation Model for Tabular Data"
date: "2026-08-03"
excerpt: "Google Research shipped a foundation model that predicts on any spreadsheet with zero training. I cloned the repo, fought my ISP for an afternoon, and ran the real thing on Colab."
tags: ["Machine Learning", "Tabular Data", "Foundation Models", "Google Research", "Python"]
coverImage: "/blog/tabfm-zero-shot-tabular-model.webp"
coverBg: "#ffffff"
coverFit: true
published: true
---

If you've spent any real time in ML, you know the drill with tabular data. You get a CSV, you spend a day cleaning it, another day engineering features, and then you kick off an XGBoost grid search that runs overnight and eats your evening. On June 30, 2026, Google Research released something that skips most of that: TabFM, a zero-shot foundation model for classification and regression on plain tables.

I didn't want to just summarize the announcement, so I cloned the actual repo, set up a Python 3.11 environment, and tried to run the classification and regression examples myself. Simple enough plan. Then my ISP decided it hated Google's CDN specifically, I somehow ended up 6GB into a model download I never signed up for, and Google Colab had to bail me out. More on that mess below. Here's how the thing actually works, followed by what actually came back when I ran it.

## What TabFM actually is

Basically, TabFM treats tabular prediction like an in-context learning problem, the same trick that lets an LLM do zero-shot prediction from examples typed straight into a prompt, without touching a single weight. You hand it your training rows and the rows you actually want predictions for, and it spits out an answer in one forward pass. No `.fit()`-then-`.tune()` loop, no hyperparameter search, no manually one-hot-encoding a categorical column at 11pm because you forgot again.

And the repo's actually pretty upfront about what it is, for once. It's `pip install`-able, scikit-learn compatible, and its own README just says, plainly, that this is *"not an officially supported Google product."* A research release, basically, not something with a marketing team standing behind it.

## How it works

Tables aren't sequences, so you can't tokenize a spreadsheet the way you'd tokenize a sentence. They're two-dimensional and orderless, swap two rows or two columns and the data means exactly the same thing it did before. TabFM gets around that with a hybrid architecture borrowing ideas from both TabPFN and TabICL, and it basically comes down to three steps.

First, the raw table runs through a multilayer attention module that alternates between columns and rows, which is what lets the model pick up feature interactions you'd otherwise have to hand-engineer yourself. Then each row's cross-attended info gets squashed down into one dense vector. And finally, a transformer runs attention over those squashed row vectors instead of the raw grid, which is the trick that keeps inference cheap even once the table gets big.

Real industrial tables are scarce, and usually locked behind an NDA somewhere anyway, so TabFM is trained entirely on hundreds of millions of synthetic datasets generated from structural causal models with a wide variety of random functions. That's basically the trick that lets a model with zero exposure to your specific domain still make sense of a table it's never once seen.

### The benchmarks, pulled straight from the repo

Google evaluated TabFM on TabArena, a living benchmark that scores models on head-to-head win rates. Instead of just taking the announcement's word for it, I went and pulled the raw parquet result files out of the repo's own `results/` folder myself. They check out: 38 classification datasets, split into 438 binary folds and 156 multiclass folds and scored on ROC-AUC and log-loss respectively, plus 13 regression datasets (`houses`, `diamonds`, `superconductivity`, `wine_quality`, and a few others), scored on RMSE and ranging from small chemistry sets up to a 150K-row housing dataset. That matches Google's own framing almost exactly, which, hey, is a nice thing to be able to say about an AI announcement for once.

There are two ways to actually run it. The default is a single forward pass, no tuning, no cross-validation, and that's everything the code below does. There's also a heavier "Ensemble" variant that adds cross features and SVD features, solves for optimal weights across a 32-way ensemble with a non-negative least-squares solver, and throws in Platt scaling for classification calibration. Better accuracy, more compute, basically the usual tradeoff. Start with the default and only bother with the ensemble once you're actually trying to squeeze out benchmark-grade numbers.

Also worth knowing, TabFM is headed straight into BigQuery, so at some point you'll be able to run `AI.PREDICT` as plain SQL over a table and skip having a model to manage at all.

## Installing it for real

TabFM supports two backends, JAX or PyTorch, and wants Python 3.11+. My system Python was still 3.9, so I grabbed Python 3.11 through Homebrew and built a fresh virtualenv instead of fighting version conflicts in my main setup.

```bash
git clone https://github.com/google-research/tabfm.git
cd tabfm

# JAX (CPU)
pip install -e .[jax]

# PyTorch (CPU/GPU)
pip install -e .[pytorch]
```

A few things the announcement conveniently leaves out. The repo's `pyproject.toml` leaves most versions unpinned on purpose, which is friendly for compatibility but also means pip's resolver can spend a genuinely long time backtracking if it hits a bad combination. If `pip install -e .[pytorch]` seems to hang, skip straight to the fully pinned lockfile instead:

```bash
pip install -r requirements.txt
pip install -e . --no-deps
```

On Apple Silicon you'll also need to open that `requirements.txt` and change `torch==2.12.1+cpu` to plain `torch==2.12.1`, and delete the `--extra-index-url` line above it. The `+cpu` build only exists for x86.

No Hugging Face token is required. The library grabs pretrained weights automatically on the first `load()` call, which is where my afternoon went sideways. Package downloads and the weight fetch both crawled at a fraction of my actual bandwidth despite a perfectly fine connection. Spent a good hour blaming DNS for it. Turned out my ISP was specifically throttling Fastly's CDN, the thing quietly serving both `pypi.org` and Hugging Face's file downloads, while leaving literally everything else untouched. A VPN fixed it in about thirty seconds. Thirty. Seconds. I also learned the hard way that the JAX backend downloads the *entire* checkpoint directory on first load, all 134-odd Orbax shard files and 6GB+ of it, where the PyTorch backend correctly scopes the download to just the model type you asked for. If you're bandwidth-constrained, or just tired of waiting, use PyTorch.

One more catch worth flagging before you get attached to this thing: the source is Apache-2.0, but the default `tabfm_v1_0_0.load()` call pulls pretrained weights under a separate `tabfm-non-commercial-v1.0` license. Those weights are restricted to non-commercial, non-production use, so check that before you point this at anything customer-facing. And if you hit a `FileNotFoundError` on the PyTorch backend looking for `pytorch_model.bin`, that's a real bug, not you doing something wrong. It existed in `v1.0.0` (the loader was looking for the wrong filename, the checkpoint only ships `model.safetensors`) and got fixed in `v1.0.1` on July 9, 2026. Just make sure you're not stuck on the first release.

Model weights and card: [huggingface.co/google/tabfm-1.0.0-pytorch](https://huggingface.co/google/tabfm-1.0.0-pytorch)
Source: [github.com/google-research/tabfm](https://github.com/google-research/tabfm)

## Running it: classification

This is close to the repo's own `examples/classification_example.py`, adapted with a slightly more realistic mixed-type table:

```python
import numpy as np
import pandas as pd
from tabfm import TabFMClassifier
from tabfm import tabfm_v1_0_0_pytorch as tabfm_v1_0_0

model = tabfm_v1_0_0.load(model_type="classification")
clf = TabFMClassifier(model=model)

# Training data, mixed numeric + categorical columns, no manual encoding
X_train = pd.DataFrame({
    "age": [25.0, 45.0, 35.0, 50.0],
    "job": ["engineer", "manager", "engineer", "manager"],
    "income": [80000, 120000, 90000, 130000],
})
y_train = np.array(["low_risk", "high_risk", "low_risk", "high_risk"])

# Rows you want predictions for
X_test = pd.DataFrame({
    "age": [30.0, 48.0],
    "job": ["engineer", "manager"],
    "income": [85000, 125000],
})

clf.fit(X_train, y_train)          # prepares internal encoders/scalers, no real "training"
predictions = clf.predict(X_test)
probabilities = clf.predict_proba(X_test)

print("Predictions:", predictions)
print("Class Probabilities:\n", probabilities)
```

Here's what actually came back, running the PyTorch backend on Colab after that whole saga (first run pulled 6.56GB of pretrained weights from Hugging Face, about 2.5 minutes on Colab's connection):

```
$ python classification_example.py
Predictions: ['low_risk' 'high_risk']
Class Probabilities:
 [[0.1401923  0.85980767]
 [0.849985   0.150015  ]]
```

That actually tracks with the pattern sitting in the four training rows. Test row 0 (age 30, engineer, $85K) got classified `low_risk` with 86% confidence, and test row 1 (age 48, manager, $125K) got `high_risk` with 85% confidence, both correctly following the age/job/income relationship the training data was hinting at, and all from four labeled rows and zero gradient steps.

`X_train` has a categorical `job` column sitting right next to numeric `age` and `income`, and TabFM just handles that mix natively, no one-hot encoding or scaling step for you to write yourself.

## Running it: regression

Same pattern, swap `TabFMClassifier` for `TabFMRegressor`:

```python
import numpy as np
import pandas as pd
from tabfm import TabFMRegressor
from tabfm import tabfm_v1_0_0_pytorch as tabfm_v1_0_0

model = tabfm_v1_0_0.load(model_type="regression")
reg = TabFMRegressor(model=model)

X_train = pd.DataFrame({
    "sqft": [1200, 2500, 1500, 3000],
    "neighborhood": ["A", "B", "A", "C"],
})
y_train = np.array([250000, 550000, 310000, 620000])

X_test = pd.DataFrame({
    "sqft": [1800, 2800],
    "neighborhood": ["A", "B"],
})

reg.fit(X_train, y_train)
predictions = reg.predict(X_test)

print("Predicted Prices:", predictions)
```

Same session, so the pretrained weights were already cached this time. Zero bytes re-downloaded, instant load:

```
$ python regression_example.py
Predicted Prices: [349939.94 581667.8]
```

1800 sqft in neighborhood A came back at about $350K, sitting neatly between the two "A" training points (1200 sqft/$250K and 1500 sqft/$310K) and extrapolating upward, which is exactly the shape you'd want to see. 2800 sqft in neighborhood B came back around $582K, just under the single "B" training point (2500 sqft/$550K) scaled up for the extra square footage. Four training rows in, two sane price predictions out, no hyperparameter search, no separate feature pipeline to maintain.

## The limits worth knowing before you reach for it

Straight from the FAQ in the repo, not from marketing copy. TabFM runs in-context learning over a bounded context window, so really large tables need to be sampled or split before inference, it just can't see the whole thing at once. The scikit-learn estimators expose that through `max_num_features` (default 500) and `max_num_rows` (default 100 context rows), plus `n_estimators` if you want to ensemble over multiple sampled contexts. And there's no technical report or paper in the repo yet covering the architecture, training pipeline, and evaluation methodology in full, so if you need a citable reference beyond the blog post, it just doesn't exist yet.

## Where to go from here

The repo ships runnable versions of both examples above under `examples/`. The full benchmark numbers, not just the headline claim, live in `results/` as parquet files, and honestly they're worth pulling yourself with `pandas.read_parquet` if you want to check a specific dataset instead of just trusting my summary, or Google's. Past that, swap in your own CSV in place of the toy `X_train`/`X_test` frames above and that's genuinely the whole workflow.

TabFM isn't going to replace a carefully tuned XGBoost model on every problem, and the non-commercial license on the default weights rules it out as a drop-in for production today. But for a first read on a brand-new table, no pipeline, no tuning loop, it's a genuinely useful thing to have around. And unlike a lot of "foundation model for X" announcements, this one actually ships working code and reproducible benchmark numbers you can go check yourself instead of just taking it on faith.

## FAQ

**Why did installing this turn into a whole ordeal instead of just working?**

Mostly bad luck stacked on bad luck. My ISP was throttling, very specifically, the one CDN that serves both PyPI and Hugging Face downloads, while leaving everything else at full speed. So of course it looked like a bandwidth problem when it was actually a routing problem. A VPN fixed it instantly once I bothered to try one. Not TabFM's fault at all, it just happened to be the thing I was downloading when I finally noticed.

**Should I use the JAX backend or the PyTorch backend?**

PyTorch. Just PyTorch, unless you have a real reason not to. The JAX backend's `load()` pulls the *entire* Orbax checkpoint directory on first run, which for me meant 134 shard files and north of 6GB for a model that's supposed to be lightweight. The PyTorch backend scopes the download to just the model type you asked for and comes in way smaller. I found this out because my laptop's fan told me before the terminal did.

**Can I actually ship this in production?**

Not with the default weights, no. The code itself is Apache-2.0, but `tabfm_v1_0_0.load()` pulls pretrained weights under a separate non-commercial license. Fine for prototyping, internal tools, a blog post like this one. Not fine for anything customer-facing without checking that license first.

**Is the zero-shot thing actually good, or is it a parlor trick?**

Four training rows each, in both the classification and regression tests, and both sets of predictions came back sane and pointed the right direction. Which is honestly more than I expected going in. It's not going to beat a properly tuned gradient-boosted model on a benchmark you actually care about, and it's not trying to. It's good for the "I just got this CSV, give me a fast first read" moment. Turns out that's a moment that happens a lot.

*Original announcement: [Introducing TabFM: A zero-shot foundation model for tabular data](https://research.google/blog/introducing-tabfm-a-zero-shot-foundation-model-for-tabular-data/), Google Research, June 30, 2026.*
