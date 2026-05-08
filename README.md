# Crop Resize

Crop Resize is a small browser-based image cropping and resizing tool. It runs entirely in the browser with plain HTML, CSS, and JavaScript.

## Features

- Drag and drop an image into the editor
- Click the editor area to choose an image file
- Paste an image from the clipboard
- Crop by dragging the corner handles
- Move the crop area by dragging its edges
- Resize the cropped output from 10% to 100%
- Export as PNG, JPEG, or WebP
- Copy the cropped output to the clipboard as PNG
- Automatically localize the UI based on the browser language

Supported UI languages:

- English
- Japanese
- Chinese
- Korean

Unsupported browser languages fall back to English.

## Usage

Open `index.html` in a browser:

```text
D:\CropResize\index.html
```

Then drop, paste, or select an image. Adjust the crop area and output resolution, then use **Copy** or **Download**.

## Clipboard Notes

Pasting images uses the browser paste event and works when the clipboard contains image data.

Copying images uses the Clipboard API. Some browsers may require permission, and clipboard image writing may be restricted depending on the browser and how the page is opened.

## Project Files

- `index.html` - Application markup
- `styles.css` - Layout and visual styling
- `app.js` - Image loading, cropping, resizing, clipboard, export, and localization logic

## Development

No build step or package installation is required.

To perform a quick JavaScript syntax check:

```bash
node --check app.js
```
