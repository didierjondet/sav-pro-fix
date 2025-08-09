export default function TestLanding() {
  console.log('TestLanding component is loading...');
  
  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Page d'accueil FixWay</h1>
        <p className="text-gray-600">Ceci est la page d'accueil principale</p>
        <p className="text-sm text-gray-500 mt-4">Si vous voyez ceci, la route / fonctionne correctement</p>
      </div>
    </div>
  );
}