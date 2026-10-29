# AI Video Universe — Free Local-First Edition

A dark AI video studio starter with **no subscriptions, no paid credits, no Pro tier, and no payment fields**.

## Important reality check

This project does not make proprietary hosted models free. Veo, Seedance, Kling, Hailuo, Grok, and hosted Higgsfield services remain controlled by their providers. They are shown in the model library as **Reference Only** and are not falsely presented as free or connected.

For genuinely no-per-generation-fee video generation, this starter is designed for **local open-weight models** running on hardware you control. Your computer supplies the compute. Depending on the model, that may require a capable GPU, significant RAM/storage, and compliance with the model's license.

The included generic server adapter can submit a **text-to-video ComfyUI API workflow**. Image-to-video and video-to-video controls are present in the UI, but the server intentionally refuses those modes until the matching input nodes are added to your own workflow. Different model workflows have different node graphs and input requirements.

## Run the website

Install a current Node.js LTS release, then:

```bash
npm install
```

Copy `.env.example` to `.env`. If you only want to inspect the site, leave the ComfyUI settings blank. Then:

```bash
npm start
```

Open http://localhost:3000

## Enable local generation

1. Install and run ComfyUI on your own computer.
2. Install/download a compatible open video model and workflow in ComfyUI.
3. Export the workflow using ComfyUI's **API format**.
4. Save that JSON file as `workflow.json` in this project directory.
5. In `.env`, set:
   - `COMFYUI_URL=http://127.0.0.1:8188`
   - `COMFYUI_WORKFLOW=./workflow.json`
6. In the workflow JSON, replace the prompt text field with the exact string `__PROMPT__`.
   Optionally replace a negative prompt field with `__NEGATIVE_PROMPT__` and a seed value with `__SEED__`.
7. Restart `npm start`.

The workflow JSON must be a valid ComfyUI API prompt graph. Placeholders are replaced recursively in string/number values. Some workflows need additional settings; add those to the graph or extend `server.js`.

## Free model examples

The UI includes Wan, CogVideoX, LTX Video, HunyuanVideo, Mochi, and AnimateDiff as local/open-model catalogue entries. Availability, license, VRAM requirements, model variants, and workflow compatibility differ. Verify each model's official repository and license before downloading or redistributing weights.

## What is included

- Dark responsive website
- Searchable model catalogue
- Model comparison
- Text-to-video form and custom workflow parameters
- Image/video upload UI (backend requires model-specific workflow extension)
- Browser-local generation history
- MP4/video download link when a workflow returns a video
- Local ComfyUI connection status
- No account system, paid API keys, subscriptions, or credit wallet

## Privacy and deployment

This starter is intended to run locally. Do not expose your ComfyUI server or this development server publicly without adding authentication, upload validation, rate limiting, and appropriate network protections. Browser history is stored in local storage on that browser only. Uploaded source files are temporary and removed after the request; the current backend does not pass them into the workflow.

A static website host can serve the frontend for free, but it cannot run video generation by itself. To keep generation free, run the model on your own machine or use a genuinely free compute grant/community resource where available. Free hosted GPU resources are limited and may have quotas or sleep restrictions.
