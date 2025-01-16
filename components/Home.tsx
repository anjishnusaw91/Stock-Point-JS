export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Welcome to Stock Point
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed mb-6">
            Your comprehensive platform for stock market analysis and prediction
          </p>
          <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded-r-lg">
            <p className="text-gray-700">
              Get access to powerful tools and insights to make informed investment decisions
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <FeatureCard
            title="Performance Comparison"
            description="Compare multiple stocks side by side to identify the best performing assets"
            icon="📊"
          />
          <FeatureCard
            title="Market Profile"
            description="Analyze detailed market profiles with advanced charting capabilities"
            icon="📈"
          />
          <FeatureCard
            title="Technical Analysis"
            description="Access comprehensive technical indicators and chart patterns"
            icon="🔍"
          />
          <FeatureCard
            title="AI Predictions"
            description="Leverage machine learning for stock price predictions and trends"
            icon="🤖"
          />
        </div>

        {/* Contact Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Need Assistance?
          </h2>
          <p className="text-gray-600 mb-4">
            Our team is here to help you make the most of Stock Point's features.
            Feel free to reach out through our Contact page for support or feedback.
          </p>
          <div className="flex items-center text-sm text-gray-500">
            <span className="mr-4">📧 support@stockpoint.com</span>
            <span>📱 +1 (555) 123-4567</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Feature Card Component
const FeatureCard = ({ title, description, icon }: { 
  title: string; 
  description: string; 
  icon: string; 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

