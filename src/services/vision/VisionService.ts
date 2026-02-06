// VisionService.ts - SuperClaw Vision AI
// Screenshot capture and Gemini Vision analysis

import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

export interface ScreenshotResult {
  base64: string;
  width: number;
  height: number;
  timestamp: number;
  fileSize: number;
}

export interface VisionAnalysis {
  description: string;
  elements: Array<{
    type: string;
    text: string;
    position: { x: number; y: number };
    confidence: number;
  }>;
  suggestions: string[];
}

export interface ElementLocation {
  x: number;
  y: number;
  confidence: number;
}

class VisionServiceClass {
  private lastScreenshot: ScreenshotResult | null = null;

  /**
   * Capture screenshot of element or full page
   */
  async captureScreen(
    element?: HTMLElement,
    options?: {
      scale?: number;
      quality?: number;
    }
  ): Promise<ScreenshotResult> {
    const target = element ?? document.body;
    const scale = options?.scale ?? 0.5;
    const quality = options?.quality ?? 0.7;

    try {
      const canvas = await html2canvas(target, {
        allowTaint: true,
        useCORS: true,
        logging: false,
        scale,
        backgroundColor: null,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight
      });

      const base64 = canvas.toDataURL('image/jpeg', quality);

      this.lastScreenshot = {
        base64,
        width: canvas.width,
        height: canvas.height,
        timestamp: Date.now(),
        fileSize: Math.round(base64.length * 0.75)
      };

      console.log(`📸 Screenshot captured: ${canvas.width}x${canvas.height}`);
      return this.lastScreenshot;
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      throw error;
    }
  }

  /**
   * Analyze screenshot with Gemini Vision
   */
  async analyzeWithVision(
    screenshot: string,
    question: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('gemini-file-analysis', {
        body: {
          fileContent: screenshot,
          fileType: 'image/jpeg',
          fileName: 'screenshot.jpg',
          userPrompt: question,
          systemPrompt: systemPrompt || 'You are ABLE Vision AI. Analyze UI screenshots and provide actionable insights in Thai.'
        }
      });

      if (error) throw error;

      return data?.analysis || 'ไม่สามารถวิเคราะห์ภาพได้';
    } catch (error) {
      console.error('Vision analysis failed:', error);
      throw error;
    }
  }

  /**
   * Find element coordinates using vision
   */
  async findElementByVision(
    description: string,
    screenshot?: string
  ): Promise<ElementLocation | null> {
    const img = screenshot || (await this.captureScreen()).base64;

    const analysis = await this.analyzeWithVision(
      img,
      `Locate the UI element: "${description}".
Return ONLY a JSON object with format: {"x": number, "y": number, "confidence": number}
where x,y are pixel coordinates from top-left, and confidence is 0-100.
If element not found, return: {"x": 0, "y": 0, "confidence": 0}`
    );

    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const result = JSON.parse(jsonMatch[0]);
      return result.confidence > 50 ? result : null;
    } catch {
      return null;
    }
  }

  /**
   * Get detailed analysis of UI state
   */
  async analyzeUIState(screenshot?: string): Promise<VisionAnalysis> {
    const img = screenshot || (await this.captureScreen()).base64;

    const analysis = await this.analyzeWithVision(
      img,
      `Analyze this trading terminal UI. Return JSON:
{
  "description": "Brief description of what you see",
  "elements": [{"type": "button/input/chart/etc", "text": "label", "position": {"x": 0, "y": 0}, "confidence": 95}],
  "suggestions": ["What actions the user might want to take"]
}`
    );

    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');

      return JSON.parse(jsonMatch[0]);
    } catch {
      return {
        description: analysis,
        elements: [],
        suggestions: []
      };
    }
  }

  /**
   * Compare two screenshots (detect changes)
   */
  async compareScreenshots(
    before: string,
    after: string
  ): Promise<{ changed: boolean; differences: string[] }> {
    const analysis = await this.analyzeWithVision(
      after,
      `Compare this screenshot with the previous state.
Previous image context: [comparing with earlier screenshot]

Identify what changed in the UI. Return JSON:
{"changed": true/false, "differences": ["list of changes"]}`,
      'You are a UI change detection system.'
    );

    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      return jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { changed: false, differences: [] };
    } catch {
      return { changed: false, differences: [] };
    }
  }

  /**
   * Get last captured screenshot
   */
  getLastScreenshot(): ScreenshotResult | null {
    return this.lastScreenshot;
  }

  /**
   * Clear cached screenshot
   */
  clearCache(): void {
    this.lastScreenshot = null;
  }

  /**
   * Extract text from image using OCR-style vision
   */
  async extractText(screenshot?: string): Promise<string> {
    const img = screenshot || (await this.captureScreen()).base64;

    return await this.analyzeWithVision(
      img,
      'Extract all visible text from this image. Return the text in order of appearance, separating sections with line breaks.',
      'You are an OCR system that extracts text from images.'
    );
  }

  /**
   * Identify chart patterns
   */
  async analyzeChart(screenshot?: string): Promise<{
    trend: string;
    patterns: string[];
    levels: { support: number[]; resistance: number[] };
    recommendation: string;
  }> {
    const img = screenshot || (await this.captureScreen()).base64;

    const analysis = await this.analyzeWithVision(
      img,
      `Analyze this trading chart. Return JSON:
{
  "trend": "bullish/bearish/sideways",
  "patterns": ["pattern names found"],
  "levels": {"support": [price levels], "resistance": [price levels]},
  "recommendation": "brief trading recommendation"
}`,
      'You are an expert technical analyst specializing in chart pattern recognition.'
    );

    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      return JSON.parse(jsonMatch[0]);
    } catch {
      return {
        trend: 'unknown',
        patterns: [],
        levels: { support: [], resistance: [] },
        recommendation: analysis
      };
    }
  }
}

export const VisionService = new VisionServiceClass();
