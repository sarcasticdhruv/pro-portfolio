---
title: "From a Kaggle Notebook to an IEEE Paper: What Actually Changed"
date: "2025-09-20"
excerpt: "Documenting the gap between a model that works on a dataset and a paper worth publishing — and what the review process forced me to understand."
tags: ["deep learning", "research", "IEEE", "computer vision"]
coverImage: ""
published: true
---

At some point in 2024, I had a model that could classify brain tumors from MRI scans with accuracy numbers that looked impressive in a table. This is not particularly difficult anymore. Pre-trained convolutional networks, good augmentation pipelines, and careful preprocessing get you most of the way there on standard medical imaging datasets.

What I didn't have was a understanding of why it worked, what it failed on, or whether any of it was actually useful.

The IEEE MPCON-2025 submission process forced me to confront all three.

---

The architecture I settled on was built around transfer learning from a VGG-16 backbone, with modifications to the final layers for the four-class classification problem: glioma, meningioma, pituitary tumor, and no tumor. The initial numbers — around 94% accuracy on the test split — were encouraging. I submitted an abstract feeling reasonably confident.

The reviewer feedback was educational in an uncomfortable way.

The first question was about class distribution. I had reported overall accuracy. The reviewers wanted per-class metrics. When I ran the analysis properly, the model's performance on meningioma detection was notably worse than on the other classes. I had missed this because the class imbalance in the dataset meant that a model optimizing for overall accuracy could essentially afford to get meningioma wrong more often. This kind of averaging artifact is a known problem in medical imaging ML, and I had fallen straight into it.

The second question was about generalizability. The dataset I had used was Kaggle-sourced — MRI images collected under a specific set of imaging conditions. Reviewers asked about performance variability across different scanner types, different contrast settings, different patient demographics. I didn't have answers. The architecture I'd built had learned, to some unknown degree, scanner-specific artifacts rather than purely tumor-relevant features.

These are not criticisms that could be addressed by running the training script again.

---

What followed was several months of more careful work. I implemented class-weighted loss functions to address the imbalance issue. I added Grad-CAM visualization to actually look at what regions the model was attending to, which revealed both reassuring patterns (the model did attend to actual tumor regions) and concerning ones (in some failure cases, it was attending to irrelevant parts of the image).

The Grad-CAM analysis was probably the most genuinely informative part of the entire project. It transformed the evaluation from "how accurate is it" to "what is it actually doing" — a shift in framing that matters enormously in any domain where the cost of a wrong answer is high.

The paper's contribution is modest. It's not a novel architecture. It doesn't introduce a new dataset. What it does is document a careful implementation and evaluation of a standard approach on a real problem, with attention to failure modes and interpretability. That sounds like a lower bar than a novel architecture, and in one sense it is. But the work required to actually understand a system thoroughly is often more than the work required to build something novel.

---

The presentation at MPCON was strange. I stood in front of a room of researchers and explained a system that I had come to understand well enough to describe its weaknesses accurately. That felt more honest than most ML presentations I've attended, where models tend to be presented primarily through their strengths.

One question from the audience has stayed with me: would this architecture generalize to other brain pathologies not in the training data. The honest answer is: probably not well, and that's an important limitation. A model trained to distinguish four specific conditions should not be deployed in a clinical setting where other conditions might present similar imaging characteristics. The model doesn't know what it doesn't know.

---

The research process changed how I think about production AI systems too.

Most ML deployed in real products has never gone through a review process that asks hard questions about failure modes, class imbalances, and generalizability. The models ship because they perform well on aggregate metrics and the edge cases surface in production rather than in evaluation.

This is not an indictment — building enough rigor into every ML project to academic publication standards isn't practical or always necessary. But having been through that process once, the questions it surfaces are now questions I ask myself whenever I'm evaluating a model for deployment.

What does the confusion matrix look like by class? What is the model actually attending to? What's the distribution of the deployment data versus the training data?

These are questions that don't take long to ask but take discipline to remember to ask.
