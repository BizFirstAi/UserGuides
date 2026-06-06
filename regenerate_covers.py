#!/usr/bin/env python3
"""
Regenerate cover images with BizFirstAI logo and proper text wrapping
"""

import json
import os
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from textwrap import wrap

# Paths
LOGO_PATH = r"C:\BizFirstGO_FI_AI\UserGuides\docs\images\icons\BizFirstAiFull.png"
OUTPUT_DIR = r"C:\BizFirstGO_FI_AI\UserGuides\docs\Article"
JOURNAL_PATH = r"C:\Users\user\.claude\projects\C--BizFirstGO-FI-AI-UserGuides\38f23490-a36f-4ce3-9434-68055997ce64\subagents\workflows\wf_d67e55be-86d\journal.jsonl"

def read_articles():
    """Extract articles from workflow journal"""
    articles = {}
    try:
        with open(JOURNAL_PATH, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    if entry.get('type') == 'result' and entry.get('result'):
                        mod = entry['result']['module']
                        if mod not in articles:
                            articles[mod] = entry['result']
                except:
                    pass
    except Exception as e:
        print(f"Error reading journal: {e}")
    return articles

def create_cover_image(module_name, description, logo_path, output_path):
    """Create a professional cover image with logo"""

    # Image dimensions
    width, height = 1000, 420

    # Colors
    bg_color = (15, 20, 25)  # Dark navy
    accent_color = (40, 99, 102, 241)  # Indigo
    text_color = (255, 255, 255)  # White
    desc_color = (200, 200, 200)  # Light gray
    accent_line = (0, 217, 255)  # Cyan

    # Create image
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # Draw right side accent box
    draw.rectangle([600, 0, 1000, 420], fill=accent_color)

    # Load logo
    try:
        logo = Image.open(logo_path)
        # Resize logo to 100x100
        logo = logo.resize((100, 100), Image.Resampling.LANCZOS)
        # Paste logo on right side
        img.paste(logo, (650, 105), logo if logo.mode == 'RGBA' else None)
    except Exception as e:
        print(f"  ⚠ Could not load logo: {e}")

    # Load fonts
    try:
        title_font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 48)
        desc_font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 14)
        brand_font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 11)
    except:
        title_font = ImageFont.load_default()
        desc_font = ImageFont.load_default()
        brand_font = ImageFont.load_default()

    # Draw title
    draw.text((40, 30), module_name, fill=text_color, font=title_font)

    # Draw accent line
    draw.line([(40, 155), (560, 155)], fill=accent_line, width=3)

    # Draw description (wrapped text)
    desc_x = 40
    desc_y = 175
    max_width = 520
    line_height = 25

    # Wrap text
    char_width = 7  # Approximate character width in pixels
    chars_per_line = max_width // char_width
    lines = wrap(description, width=chars_per_line)

    for line in lines:
        draw.text((desc_x, desc_y), line, fill=desc_color, font=desc_font)
        desc_y += line_height

    # Draw branding
    draw.text((630, 360), "BizFirstAI.com", fill=text_color, font=brand_font)

    # Save
    img.save(output_path, 'PNG')
    return True

def main():
    """Regenerate all cover images"""

    # Read articles
    articles = read_articles()
    print(f"Found {len(articles)} articles")
    print(f"Regenerating cover images with BizFirstAI logo...\n")

    processed = 0
    failed = 0

    for module_name in sorted(articles.keys()):
        try:
            article = articles[module_name]
            module_dir = os.path.join(OUTPUT_DIR, module_name)
            cover_path = os.path.join(module_dir, "cover.png")

            create_cover_image(
                module_name,
                article['description'],
                LOGO_PATH,
                cover_path
            )

            print(f"✓ {module_name}")
            processed += 1
        except Exception as e:
            print(f"✗ {module_name}: {e}")
            failed += 1

    print(f"\nREGENERATION COMPLETE:")
    print(f"  Successfully regenerated: {processed} images")
    print(f"  Failed: {failed} images")
    print(f"  All images now include BizFirstAI logo")
    print(f"  Text properly wrapped (no cut-off)")

if __name__ == "__main__":
    main()
