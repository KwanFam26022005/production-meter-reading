# Model placement

This directory contains **documentation only**. Do not commit company-trained model binaries to this public repository.

Expected local layout:

```text
models/
├── e2/
│   └── best.pt
└── ppocrv6_medium/
    ├── inference/
    │   ├── inference.json / inference.pdmodel
    │   └── *.pdiparams
    └── meter_digits_dict.txt
```

Current frozen artifacts used by the validated company pipeline:

- E2 SHA-256: `d74c7fda06494f7c089464641e51156236565b93956ed2c89c5e57b1841868d2`
- PP-OCRv6-Medium r1: exported inference directory from `recognition_v2_ppocrv6_medium_digits/PP-OCRv6_medium_digits_r1/inference`
- Character dictionary: digits `0..9` plus `.`

Store/download these artifacts privately on the inference host or mount them into the container. `.gitignore` blocks the common model binary formats.
