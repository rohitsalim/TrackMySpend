export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Welcome to TrackMySpend</h1>
        <p className="text-xl text-muted-foreground">
          Your Financial Statement Analysis Platform
        </p>
      </div>

      <div className="text-center">
        <p className="text-muted-foreground">
          Upload your bank statements to get started with automated transaction analysis and insights.
        </p>
      </div>
    </div>
  );
}
