#!/usr/bin/env node

/**
 * Fire Rescue App Status Checker
 * Monitors the development server and app status
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function logHeader(title) {
  log('\n' + '='.repeat(50), 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(50), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function checkPackageJson() {
  logHeader('Package Configuration');
  
  try {
    const packageJsonPath = 'package.json';
    if (!fs.existsSync(packageJsonPath)) {
      logError('package.json not found');
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    logSuccess(`App Name: ${packageJson.name}`);
    logSuccess(`Version: ${packageJson.version}`);
    
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Check key dependencies
    const keyDeps = [
      'expo',
      'react-native',
      'react',
      '@supabase/supabase-js',
      'crypto-js',
      'react-native-chart-kit',
      '@react-three/fiber',
      '@react-three/drei',
      'three',
      'expo-camera'
    ];

    let allPresent = true;
    keyDeps.forEach(dep => {
      if (dependencies[dep]) {
        logSuccess(`${dep}: ${dependencies[dep]}`);
      } else {
        logWarning(`Missing: ${dep}`);
        allPresent = false;
      }
    });

    return allPresent;
  } catch (error) {
    logError(`Error reading package.json: ${error.message}`);
    return false;
  }
}

async function checkProjectStructure() {
  logHeader('Project Structure');
  
  const requiredDirs = [
    'src',
    'src/screens',
    'src/components', 
    'src/services',
    'src/navigation',
    'supabase',
    'supabase/migrations'
  ];

  let allPresent = true;
  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      logSuccess(`Directory: ${dir}`);
    } else {
      logError(`Missing directory: ${dir}`);
      allPresent = false;
    }
  });

  return allPresent;
}

async function checkSmartFeatures() {
  logHeader('Smart Features Status');
  
  const smartFiles = [
    'src/services/aiPredictiveService.js',
    'src/services/droneService.js',
    'src/services/iotSensorService.js',
    'src/services/blockchainCredentialsService.js',
    'src/components/SmartIncidentAnalysis.js',
    'src/components/AREmergencyNavigation.js',
    'src/components/SimpleARNavigation.js',
    'src/screens/SmartEmergencyDashboard.js',
    'src/screens/SmartFeaturesDemo.js'
  ];

  let allPresent = true;
  smartFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      logSuccess(`${path.basename(file)} (${Math.round(stats.size / 1024)}KB)`);
    } else {
      logError(`Missing: ${path.basename(file)}`);
      allPresent = false;
    }
  });

  return allPresent;
}

async function checkMetroServer() {
  logHeader('Development Server Status');
  
  return new Promise((resolve) => {
    exec('netstat -an | findstr :8081', (error, stdout, stderr) => {
      if (stdout && stdout.includes('8081')) {
        logSuccess('Metro server is running on port 8081');
        resolve(true);
      } else {
        logWarning('Metro server might not be running');
        logInfo('Try running: npx expo start');
        resolve(false);
      }
    });
  });
}

async function checkEnvironmentVariables() {
  logHeader('Environment Variables');
  
  if (fs.existsSync('.env')) {
    logSuccess('.env file found');
    try {
      const envContent = fs.readFileSync('.env', 'utf8');
      const envVars = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY'];
      
      let allPresent = true;
      envVars.forEach(varName => {
        if (envContent.includes(varName)) {
          logSuccess(`${varName}: configured`);
        } else {
          logWarning(`${varName}: not found`);
          allPresent = false;
        }
      });
      
      return allPresent;
    } catch (error) {
      logError(`Error reading .env: ${error.message}`);
      return false;
    }
  } else {
    logWarning('.env file not found');
    logInfo('Create .env file with required environment variables');
    return false;
  }
}

async function generateReport() {
  logHeader('Fire Rescue App Status Report');
  logInfo(`Report generated at: ${new Date().toLocaleString()}\n`);

  const results = {
    'Package Configuration': await checkPackageJson(),
    'Project Structure': await checkProjectStructure(),
    'Smart Features': await checkSmartFeatures(),
    'Environment Variables': await checkEnvironmentVariables(),
    'Metro Server': await checkMetroServer()
  };

  logHeader('Summary');
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(result => result).length;
  const successRate = Math.round((passedChecks / totalChecks) * 100);

  Object.entries(results).forEach(([checkName, passed]) => {
    if (passed) {
      logSuccess(`${checkName}: PASSED`);
    } else {
      logError(`${checkName}: ISSUES FOUND`);
    }
  });

  log('\n' + '='.repeat(40), 'cyan');
  logInfo(`Overall Health: ${passedChecks}/${totalChecks} (${successRate}%)`);
  
  if (successRate >= 90) {
    logSuccess('🎉 App is ready for development!');
    logInfo('Try scanning the QR code with Expo Go');
  } else if (successRate >= 75) {
    logWarning('⚠️  Some issues found, but app should work');
  } else {
    logError('❌ Multiple issues found, please fix before testing');
  }
  
  log('='.repeat(40), 'cyan');

  // Next steps
  logHeader('Next Steps');
  logInfo('1. Scan QR code with Expo Go app');
  logInfo('2. Test Smart Emergency Dashboard');
  logInfo('3. Try Smart Features Demo');
  logInfo('4. Test AR Navigation (both modes)');
  logInfo('5. Verify all services are working');
  
  return successRate;
}

// Run the status check
generateReport().catch(console.error);
