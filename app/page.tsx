import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen p-8 bg-background">
      <main className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">TrackMySpend</h1>
          <p className="text-xl text-muted-foreground">
            Financial Statement Analysis Platform
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Theme Testing</CardTitle>
              <CardDescription>
                Testing the tweakcn "tms 2" theme integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="default">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
              </div>
              <div className="flex gap-2">
                <Button variant="destructive">Destructive</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Financial Colors</CardTitle>
              <CardDescription>
                Testing financial app specific colors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="amount-credit font-semibold">+₹1,000 (Credit)</div>
                <div className="amount-debit font-semibold">-₹500 (Debit)</div>
                <div className="amount-warning font-semibold">₹100 (Warning)</div>
              </div>
              <div className="grid grid-cols-5 gap-2 mt-4">
                <div className="w-full h-8 bg-chart-1 rounded"></div>
                <div className="w-full h-8 bg-chart-2 rounded"></div>
                <div className="w-full h-8 bg-chart-3 rounded"></div>
                <div className="w-full h-8 bg-chart-4 rounded"></div>
                <div className="w-full h-8 bg-chart-5 rounded"></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Theme Information</CardTitle>
              <CardDescription>
                Current theme details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>Theme:</strong> tweakcn "tms 2"</div>
              <div><strong>Color Model:</strong> OKLCH</div>
              <div><strong>Font:</strong> Outfit</div>
              <div><strong>Dark Mode:</strong> Supported</div>
              <div><strong>Financial Colors:</strong> Optimized</div>
              <div><strong>Chart Colors:</strong> 5 variants</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Color Palette</CardTitle>
            <CardDescription>
              Complete color palette for both light and dark modes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <h4 className="font-semibold">Core Colors</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-background border rounded"></div>
                    <span className="text-sm">Background</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-foreground rounded"></div>
                    <span className="text-sm">Foreground</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary rounded"></div>
                    <span className="text-sm">Primary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-secondary rounded"></div>
                    <span className="text-sm">Secondary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-muted rounded"></div>
                    <span className="text-sm">Muted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-accent rounded"></div>
                    <span className="text-sm">Accent</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Financial Colors</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-success rounded"></div>
                    <span className="text-sm">Credit/Success</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-destructive rounded"></div>
                    <span className="text-sm">Debit/Destructive</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-warning rounded"></div>
                    <span className="text-sm">Warning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-border rounded"></div>
                    <span className="text-sm">Border</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
