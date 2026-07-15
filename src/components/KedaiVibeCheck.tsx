import { useState } from 'react';
import { Loader2, Sparkles, Flag, ThumbsUp, Users, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Kedai } from '@/types/kedai';
import { useApiDiagnostics } from '@/hooks/useApiDiagnostics';
import { ApiDiagnosticError, invokeEdgeFunction } from '@/lib/edge-functions';
import { getConciseDiagnosticMessage } from '@/types/api-diagnostics';

interface VibeCheckResult {
  vibeScore: number;
  verdict: string;
  summary: string;
  greenFlags: string[];
  redFlags: string[];
  bestFor: string;
  avoidIf: string;
}

interface KedaiVibeCheckProps {
  kedai: Kedai;
}

export function KedaiVibeCheck({ kedai }: KedaiVibeCheckProps) {
  const { reportDiagnostic } = useApiDiagnostics();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VibeCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const runVibeCheck = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, diagnostics } = await invokeEdgeFunction<VibeCheckResult>('vibecheck', {
        body: {
          kedaiName: kedai.name,
          reviews: kedai.reviews || [],
          rating: kedai.rating,
          priceLevel: kedai.price_level
        }
      });

      diagnostics.forEach((diagnostic) => {
        reportDiagnostic({ ...diagnostic, source: 'Vibe check' });
      });
      setResult(data);
    } catch (err) {
      console.error('VibeCheck error:', err);
      if (err instanceof ApiDiagnosticError) {
        reportDiagnostic({ ...err.diagnostic, source: 'Vibe check' });
        setError(getConciseDiagnosticMessage(err.diagnostic));
      } else {
        setError('Failed to analyze vibe. Cuba lagi!');
      }
    } finally {
      setLoading(false);
    }
  };

  const getVibeColor = (score: number) => {
    if (score >= 80) return 'text-secondary';
    if (score >= 60) return 'text-accent';
    if (score >= 40) return 'text-orange-500';
    return 'text-destructive';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-secondary';
    if (score >= 60) return 'bg-accent';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-destructive';
  };

  if (!result && !loading) {
    return (
      <div className="relative inline-block">
        <style>{`
          @keyframes animateRainbowBorder {
            0% { background-position: 0% 50%; }
            100% { background-position: 89% 50%; }
          }
        `}</style>
        <Button
          variant="outline"
          size="sm"
          onClick={runVibeCheck}
          className="relative gap-2 border-0 bg-card hover:bg-card transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 before:absolute before:-inset-[2px] before:rounded-md before:bg-gradient-to-r before:from-red-500 before:via-yellow-500 before:to-green-500 before:bg-[length:400%] before:animate-[animateRainbowBorder_3s_linear_infinite] before:-z-10 after:absolute after:-inset-[2px] after:rounded-md after:bg-gradient-to-r after:from-red-500 after:via-yellow-500 after:to-green-500 after:bg-[length:400%] after:blur-xl after:opacity-50 after:-z-20 after:animate-[animateRainbowBorder_3s_linear_infinite]"
        >
          <div className="relative">
            <svg width="20" height="20" viewBox="0 0 101 117" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
              <path d="M42.8906 43.1L43.0205 43.17" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M98.6506 57.65L91.6606 75.83L77.9006 83.78L70.9106 73.66L77.9006 55.48L91.6606 47.53L98.6506 57.65Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M74.2004 55.26L69.7004 66.96L67.7405 72.07L67.2104 73.44L62.8306 75.97L62.5806 76.12L53.4504 81.39L53.1606 80.97L46.4604 71.27L47.5005 68.57L47.5806 68.35L53.4504 53.1L55.4006 51.97L62.5806 47.82L66.9504 45.3L67.2104 45.15L67.5005 45.57L72.4805 52.77L74.2004 55.26Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M98.6506 24.64L91.6606 42.82L87.2905 45.34L77.9006 50.77L77.6106 50.35L70.9106 40.65L71.9504 37.95L72.0405 37.72L77.9006 22.47L91.6606 14.53L98.6506 24.64Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M91.6602 47.53L77.9001 55.48L76 54.53L72.48 52.77L67.5 45.57L77.52 50.58L77.9001 50.77L87.29 45.34L91.6602 47.53Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M53.4504 86.1L46.4604 104.28L43.2705 102.69L45.1406 97.65L49.4407 86.06L47.5505 83.15L53.4504 86.1Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M67.2104 45.15L66.9504 45.3L62.5806 47.82L55.4006 51.97L53.4504 53.1L51.5505 52.15L47.5605 50.16V50.15L43.0205 43.17L53.0706 48.19L53.4504 48.38L57.7405 45.9L58.2104 45.63L62.5806 43.11L62.8306 42.96L67.2104 45.15Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M42.76 75.77L42.5 75.92L38.1301 78.44L30.95 82.59L29 83.72L26.97 82.71L9 73.72L13.3801 71.19L28.45 78.73L29 79L33.29 76.52L33.76 76.25L38.1301 73.73L38.3801 73.58L42.76 75.77Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M49.4404 86.06L45.1404 97.65L43.2703 102.69L42.7603 104.06L38.5403 106.5L29.0002 112.01L22.0103 101.9L29.0002 83.72L30.9502 82.59L38.1304 78.44L42.5002 75.92L42.7603 75.77L43.0203 76.17V76.18L47.5503 83.15L49.4404 86.06Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M29.0002 112.01L9.00024 102.01L2.01025 91.9L15.1404 98.46L22.0103 101.9L29.0002 112.01Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M53.1602 47.96L53.0701 48.19L43.02 43.17V43.16L42.76 42.76L38.0801 40.42L33.71 38.23L33.1602 37.96L26.46 28.27L39.5901 34.83L43.97 37.02L46.46 38.27L53.1602 47.96Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M53.45 20.09L47.5901 35.34L47.5 35.57L46.46 38.27L43.97 37.02L39.5901 34.83L26.46 28.27L33.45 10.09L53.45 20.09Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M77.9004 22.47L72.0403 37.72L71.9502 37.95L70.9104 40.65L68.4204 39.4L67.7402 39.06L69.7002 33.95L74.2002 22.25L72.4802 19.76L76.0002 21.52L77.9004 22.47Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M91.6604 14.53L77.9004 22.47L76.0002 21.52L72.4802 19.76L67.2102 12.14L62.5303 9.79999L71.6604 4.53L91.6604 14.53Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M74.2 22.25L69.7 33.95L67.74 39.06L67.3701 40.01L67.21 40.43L62.8301 42.96L62.5801 43.11L58.21 45.63L57.74 45.9L53.45 48.38L53.1602 47.96L46.46 38.27L47.5 35.57L47.5901 35.34L53.45 20.09L55.4001 18.96L62.5801 14.81L67.21 12.14L72.48 19.76L74.2 22.25Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M67.2102 12.14L62.5803 14.81L55.4004 18.96L53.4502 20.09L33.4502 10.09L47.2102 2.14001L62.5303 9.79999L67.2102 12.14Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M49.4404 53.05L45.1404 64.64L43.2703 69.68L42.9104 70.64L42.7603 71.05L38.3804 73.58L38.1304 73.73L33.7603 76.25L33.2903 76.52L29.0002 79L28.5803 78.39L22.0103 68.89L23.0403 66.2L23.1404 65.96L29.0002 50.71L30.9602 49.58L38.1304 45.44L42.5002 42.91L42.7603 42.76L43.0203 43.16L42.8904 43.1L43.0203 43.17L47.5603 50.15V50.16L49.4404 53.05Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M42.76 42.76L42.5 42.91L38.1301 45.44L30.96 49.58L29 50.71L26.97 49.7L9 40.71L22.76 32.76L33.1602 37.96L33.71 38.23L38.0801 40.42L42.76 42.76Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M29.0002 79L28.4502 78.73L13.3804 71.19L9.00024 69L2.01025 58.89L15.1404 65.45L19.5203 67.64L22.0103 68.89L28.5803 78.39L29.0002 79Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M29.0002 50.71L23.1404 65.96L23.0403 66.2L22.0103 68.89L19.5203 67.64L15.1404 65.45L2.01025 58.89L9.00024 40.71L26.9702 49.7L29.0002 50.71Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M53.8601 114.16L38.54 106.5L42.76 104.06L43.27 102.69L46.46 104.28L53.8601 114.16Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M29.0002 83.72L22.0103 101.9L15.1404 98.46L2.01025 91.9L9.00024 73.72L26.9702 82.71L29.0002 83.72Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M74.2 88.27L67.21 106.45L53.8601 114.16L46.46 104.28L53.45 86.1L66.95 78.31L67.21 78.16L67.5 78.58L74.2 88.27Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M77.9001 83.78L67.5 78.58L67.21 78.16L62.8301 75.97L67.21 73.44L67.74 72.07L70.9102 73.66L77.9001 83.78Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M77.9004 55.48L70.9104 73.66L67.7402 72.07L69.7002 66.96L74.2002 55.26L72.4802 52.77L76.0002 54.53L77.9004 55.48Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M67.2104 78.16L66.9504 78.31L53.4504 86.1L47.5505 83.15L43.0205 76.18L53.0706 81.2L53.4504 81.39L62.5806 76.12L62.8306 75.97L67.2104 78.16Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M53.4502 81.39L53.0703 81.2L43.0203 76.18V76.17L42.7603 75.77L38.3804 73.58L42.7603 71.05L42.9104 70.64L43.2703 69.68L43.9702 70.03L46.4602 71.27L53.1604 80.97L53.4502 81.39Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M77.9001 50.77L77.52 50.58L67.5 45.57L67.21 45.15L62.8301 42.96L67.21 40.43L67.3701 40.01L67.74 39.06L68.4202 39.4L70.9102 40.65L77.6101 50.35L77.9001 50.77Z" stroke="#229EFF" strokeLinejoin="round"/>
              <path d="M53.4504 53.1L47.5806 68.35L47.5005 68.57L46.4604 71.27L43.9705 70.03L43.2705 69.68L45.1406 64.64L49.4407 53.05L47.5605 50.16L51.5505 52.15L53.4504 53.1Z" stroke="#229EFF" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Analyze Krack
          </span>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent rounded-xl border border-primary/20 animate-pulse">
        <div className="flex items-center gap-2 text-sm">
          <div className="relative">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-sm" />
          </div>
          <span className="font-medium text-foreground">Checking Kracked Meter...</span>
        </div>
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-pulse" 
            style={{ width: '60%' }} 
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 rounded-lg">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="ghost" size="sm" onClick={runVibeCheck} className="mt-2">
          Try again
        </Button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-primary/20 space-y-4 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Analyze Krack</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{result.verdict.split(' ')[0]}</span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-muted rounded transition-colors"
            aria-label={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Score */}
      {isExpanded && (
      <>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Vibe Score</span>
            <span className={`text-2xl font-bold ${getVibeColor(result.vibeScore)}`}>
              {result.vibeScore}/100
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${getProgressColor(result.vibeScore)} transition-all duration-500`}
              style={{ width: `${result.vibeScore}%` }}
            />
          </div>
          <p className="text-lg font-medium text-foreground">{result.verdict}</p>
        </div>

        {/* Summary */}
        <p className="text-sm text-muted-foreground italic">"{result.summary}"</p>

        {/* Flags */}
        <div className="grid grid-cols-2 gap-3">
        {/* Green Flags */}
        {result.greenFlags.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-secondary">
              <ThumbsUp className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Green Flags</span>
            </div>
            {result.greenFlags.map((flag) => (
              <p key={flag} className="text-xs text-muted-foreground pl-5">• {flag}</p>
            ))}
          </div>
        )}

        {/* Red Flags */}
        {result.redFlags.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Red Flags</span>
            </div>
            {result.redFlags.map((flag) => (
              <p key={flag} className="text-xs text-muted-foreground pl-5">• {flag}</p>
            ))}
          </div>
        )}
        </div>

        {/* Best For / Avoid */}
        <div className="flex gap-4 pt-2 border-t border-border">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Users className="w-3 h-3" />
            Best for
          </div>
          <p className="text-xs text-foreground">{result.bestFor}</p>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Flag className="w-3 h-3" />
            Avoid if
          </div>
          <p className="text-xs text-foreground">{result.avoidIf}</p>
        </div>
        </div>

        {/* Re-run */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={runVibeCheck} 
          className="w-full text-xs hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Sparkles className="w-3 h-3 mr-1.5" />
          Analyze Krack again
        </Button>
      </>
      )}
    </div>
  );
}
