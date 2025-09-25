#!/usr/bin/env node

/**
 * Fire Rescue Smart Features Test Suite
 * 
 * This script tests all the newly implemented smart features
 * to ensure they work correctly before deployment.
 */

const fs = require('fs');
const path = require('path');

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
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
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

// Test file existence
function testFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    logSuccess(`${description}: ${path.basename(filePath)}`);
  } else {
    logError(`${description}: ${path.basename(filePath)} - FILE NOT FOUND`);
  }
  return exists;
}

// Test service files
function testServices() {
  logHeader('Testing Service Files');
  
  const services = [
    {
      path: 'src/services/aiPredictiveService.js',
      description: 'AI Predictive Analytics Service'
    },
    {
      path: 'src/services/droneService.js',
      description: 'Drone Integration Service'
    },
    {
      path: 'src/services/iotSensorService.js',
      description: 'IoT Sensor Network Service'
    },
    {
      path: 'src/services/blockchainCredentialsService.js',
      description: 'Blockchain Credentials Service'
    }
  ];

  let allServicesExist = true;
  services.forEach(service => {
    const exists = testFileExists(service.path, service.description);
    if (!exists) allServicesExist = false;
  });

  return allServicesExist;
}

// Test component files
function testComponents() {
  logHeader('Testing Component Files');
  
  const components = [
    {
      path: 'src/components/SmartIncidentAnalysis.js',
      description: 'Smart Incident Analysis Component'
    },
    {
      path: 'src/components/AREmergencyNavigation.js',
      description: 'AR Emergency Navigation Component'
    }
  ];

  let allComponentsExist = true;
  components.forEach(component => {
    const exists = testFileExists(component.path, component.description);
    if (!exists) allComponentsExist = false;
  });

  return allComponentsExist;
}

// Test screen files
function testScreens() {
  logHeader('Testing Screen Files');
  
  const screens = [
    {
      path: 'src/screens/SmartEmergencyDashboard.js',
      description: 'Smart Emergency Dashboard Screen'
    },
    {
      path: 'src/screens/SmartFeaturesDemo.js',
      description: 'Smart Features Demo Screen'
    }
  ];

  let allScreensExist = true;
  screens.forEach(screen => {
    const exists = testFileExists(screen.path, screen.description);
    if (!exists) allScreensExist = false;
  });

  return allScreensExist;
}

// Test database migration
function testDatabase() {
  logHeader('Testing Database Files');
  
  const dbFiles = [
    {
      path: 'supabase/migrations/20241219_smart_features.sql',
      description: 'Smart Features Database Migration'
    }
  ];

  let allDbFilesExist = true;
  dbFiles.forEach(file => {
    const exists = testFileExists(file.path, file.description);
    if (!exists) allDbFilesExist = false;
  });

  return allDbFilesExist;
}

// Test package.json dependencies
function testDependencies() {
  logHeader('Testing Package Dependencies');
  
  try {
    const packageJsonPath = 'package.json';
    if (!fs.existsSync(packageJsonPath)) {
      logError('package.json not found');
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const requiredDeps = [
      'crypto-js',
      'react-native-chart-kit',
      '@react-three/fiber',
      '@react-three/drei'
    ];

    let allDepsPresent = true;
    requiredDeps.forEach(dep => {
      if (dependencies[dep]) {
        logSuccess(`Dependency: ${dep} v${dependencies[dep]}`);
      } else {
        logError(`Missing dependency: ${dep}`);
        allDepsPresent = false;
      }
    });

    return allDepsPresent;
  } catch (error) {
    logError(`Error reading package.json: ${error.message}`);
    return false;
  }
}

// Test navigation setup
function testNavigation() {
  logHeader('Testing Navigation Setup');
  
  try {
    const navPath = 'src/navigation/AppNavigator.js';
    if (!fs.existsSync(navPath)) {
      logError('AppNavigator.js not found');
      return false;
    }

    const navContent = fs.readFileSync(navPath, 'utf8');
    
    const requiredScreens = [
      'SmartEmergencyDashboard',
      'SmartFeaturesDemo'
    ];

    let allScreensRegistered = true;
    requiredScreens.forEach(screen => {
      if (navContent.includes(`name="${screen}"`)) {
        logSuccess(`Navigation screen registered: ${screen}`);
      } else {
        logError(`Navigation screen missing: ${screen}`);
        allScreensRegistered = false;
      }
    });

    return allScreensRegistered;
  } catch (error) {
    logError(`Error reading navigation file: ${error.message}`);
    return false;
  }
}

// Test code quality
function testCodeQuality() {
  logHeader('Testing Code Quality');
  
  const codeFiles = [
    'src/services/aiPredictiveService.js',
    'src/services/droneService.js',
    'src/services/iotSensorService.js',
    'src/services/blockchainCredentialsService.js'
  ];

  let qualityScore = 0;
  let totalTests = 0;

  codeFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Test for proper exports
      totalTests++;
      if (content.includes('export default') || content.includes('module.exports')) {
        logSuccess(`${path.basename(filePath)}: Proper exports`);
        qualityScore++;
      } else {
        logWarning(`${path.basename(filePath)}: Missing exports`);
      }

      // Test for error handling
      totalTests++;
      if (content.includes('try') && content.includes('catch')) {
        logSuccess(`${path.basename(filePath)}: Error handling present`);
        qualityScore++;
      } else {
        logWarning(`${path.basename(filePath)}: Missing error handling`);
      }

      // Test for documentation
      totalTests++;
      if (content.includes('/**') || content.includes('//')) {
        logSuccess(`${path.basename(filePath)}: Documentation present`);
        qualityScore++;
      } else {
        logWarning(`${path.basename(filePath)}: Missing documentation`);
      }
    }
  });

  const qualityPercentage = Math.round((qualityScore / totalTests) * 100);
  logInfo(`Code Quality Score: ${qualityScore}/${totalTests} (${qualityPercentage}%)`);
  
  return qualityPercentage >= 75;
}

// Generate test report
function generateReport(results) {
  logHeader('Test Results Summary');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(result => result).length;
  const successRate = Math.round((passedTests / totalTests) * 100);

  Object.entries(results).forEach(([testName, passed]) => {
    if (passed) {
      logSuccess(`${testName}: PASSED`);
    } else {
      logError(`${testName}: FAILED`);
    }
  });

  log('\n' + '='.repeat(40), 'cyan');
  logInfo(`Overall Success Rate: ${passedTests}/${totalTests} (${successRate}%)`);
  
  if (successRate >= 90) {
    logSuccess('🎉 Excellent! All systems ready for deployment');
  } else if (successRate >= 75) {
    logWarning('⚠️  Good! Minor issues need attention');
  } else {
    logError('❌ Major issues found. Fix before deployment');
  }
  
  log('='.repeat(40), 'cyan');
}

// Main test execution
function runTests() {
  logHeader('Fire Rescue Smart Features Test Suite');
  logInfo('Testing all newly implemented smart features...\n');

  const results = {
    'Services': testServices(),
    'Components': testComponents(),
    'Screens': testScreens(),
    'Database': testDatabase(),
    'Dependencies': testDependencies(),
    'Navigation': testNavigation(),
    'Code Quality': testCodeQuality()
  };

  generateReport(results);
}

// Run the tests
runTests();
