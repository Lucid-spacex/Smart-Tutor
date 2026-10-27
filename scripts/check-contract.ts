/**
 * Contract Verification Script
 * 
 * This script verifies that all endpoints documented in API_CONTRACT.md
 * actually exist in the Express routes, and vice versa.
 * 
 * Usage: npx ts-node scripts/check-contract.ts
 */

import fs from 'fs';
import path from 'path';

interface RouteInfo {
  method: string;
  path: string;
  module: string;
}

interface ContractEndpoint {
  method: string;
  path: string;
  module: string;
}

// Extract routes from Express route files
function extractRoutesFromFile(filePath: string, moduleName: string): RouteInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const routes: RouteInfo[] = [];
  
  // Match common Express route patterns
  const routePatterns = [
    /router\.(get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/g,
    /router\.(get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]\s*,/g,
  ];
  
  for (const pattern of routePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      routes.push({
        method: match[1].toUpperCase(),
        path: match[2],
        module: moduleName,
      });
    }
  }
  
  return routes;
}

// Extract all routes from the codebase
function extractAllRoutes(): RouteInfo[] {
  const routesPath = path.join(process.cwd(), 'src/modules');
  const routes: RouteInfo[] = [];
  
  if (!fs.existsSync(routesPath)) {
    console.error('Routes directory not found:', routesPath);
    return routes;
  }
  
  const modules = fs.readdirSync(routesPath, { withFileTypes: true });
  
  for (const module of modules) {
    if (module.isDirectory()) {
      const modulePath = path.join(routesPath, module.name);
      const routeFile = path.join(modulePath, `${module.name}.routes.ts`);
      
      if (fs.existsSync(routeFile)) {
        const moduleRoutes = extractRoutesFromFile(routeFile, module.name);
        routes.push(...moduleRoutes);
      }
    }
  }
  
  return routes;
}

// Extract endpoints from API_CONTRACT.md
function extractContractEndpoints(): ContractEndpoint[] {
  const contractPath = path.join(process.cwd(), 'docs/API_CONTRACT.md');
  
  if (!fs.existsSync(contractPath)) {
    console.error('API_CONTRACT.md not found:', contractPath);
    return [];
  }
  
  const content = fs.readFileSync(contractPath, 'utf-8');
  const endpoints: ContractEndpoint[] = [];
  
  // Match endpoint headers in the contract
  // Pattern: ### METHOD /path
  const endpointPattern = /### (GET|POST|PUT|PATCH|DELETE) (\/api\/[^\s]+)/g;
  
  let match;
  while ((match = endpointPattern.exec(content)) !== null) {
    endpoints.push({
      method: match[1],
      path: match[2],
      module: 'documented',
    });
  }
  
  return endpoints;
}

// Normalize paths for comparison
function normalizePath(path: string): string {
  // Remove trailing slashes
  return path.replace(/\/$/, '');
}

// Compare routes and contract
function compareRoutes() {
  const codeRoutes = extractAllRoutes();
  const contractEndpoints = extractContractEndpoints();
  
  console.log(`\n=== Contract Verification ===\n`);
  console.log(`Found ${codeRoutes.length} routes in code`);
  console.log(`Found ${contractEndpoints.length} endpoints in contract\n`);
  
  // Build route map from code
  const codeRouteMap = new Map<string, RouteInfo>();
  for (const route of codeRoutes) {
    const key = `${route.method}:${normalizePath(route.path)}`;
    codeRouteMap.set(key, route);
  }
  
  // Check for missing routes in code
  const missingInCode: ContractEndpoint[] = [];
  for (const endpoint of contractEndpoints) {
    const key = `${endpoint.method}:${normalizePath(endpoint.path)}`;
    if (!codeRouteMap.has(key)) {
      missingInCode.push(endpoint);
    }
  }
  
  // Check for undocumented routes
  const undocumented: RouteInfo[] = [];
  for (const route of codeRoutes) {
    const key = `${route.method}:${normalizePath(route.path)}`;
    // Check if this route exists in contract
    const exists = contractEndpoints.some(
      e => e.method === route.method && normalizePath(e.path) === normalizePath(route.path)
    );
    if (!exists) {
      undocumented.push(route);
    }
  }
  
  // Report results
  if (missingInCode.length > 0) {
    console.log(`❌ ${missingInCode.length} endpoints documented but NOT found in code:\n`);
    for (const endpoint of missingInCode) {
      console.log(`   ${endpoint.method} ${endpoint.path}`);
    }
    console.log('');
  } else {
    console.log(`✅ All documented endpoints exist in code\n`);
  }
  
  if (undocumented.length > 0) {
    console.log(`⚠️  ${undocumented.length} routes in code but NOT documented:\n`);
    for (const route of undocumented) {
      console.log(`   ${route.method} ${route.path} (${route.module})`);
    }
    console.log('');
  } else {
    console.log(`✅ All code routes are documented\n`);
  }
  
  const hasErrors = missingInCode.length > 0;
  const hasWarnings = undocumented.length > 0;
  
  console.log(`=== Summary ===`);
  console.log(`Missing in code: ${missingInCode.length}`);
  console.log(`Undocumented: ${undocumented.length}`);
  console.log(`Total routes: ${codeRoutes.length}`);
  console.log(`Total documented: ${contractEndpoints.length}`);
  
  if (hasErrors) {
    process.exit(1);
  }
}

// Run the verification
compareRoutes();
