#!/usr/bin/env node

/**
 * OZ Kitchen Setup Script
 * Automates the initial setup process for development
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function success(message) {
  log(`✅ ${message}`, colors.green)
}

function error(message) {
  log(`❌ ${message}`, colors.red)
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow)
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue)
}

function header(message) {
  log(`\n${colors.bold}${colors.blue}🍱 ${message}${colors.reset}`)
}

function runCommand(command, description) {
  try {
    info(`Running: ${description}`)
    execSync(command, { stdio: 'inherit' })
    success(`Completed: ${description}`)
    return true
  } catch (err) {
    error(`Failed: ${description}`)
    console.error(err.message)
    return false
  }
}

function checkPrerequisites() {
  header('Checking Prerequisites')
  
  const requirements = [
    { command: 'node --version', name: 'Node.js', minVersion: '18.0.0' },
    { command: 'pnpm --version', name: 'pnpm', required: true },
    { command: 'supabase --version', name: 'Supabase CLI', required: true }
  ]

  let allGood = true

  for (const req of requirements) {
    try {
      const output = execSync(req.command, { encoding: 'utf8' }).trim()
      success(`${req.name}: ${output}`)
    } catch (err) {
      if (req.required) {
        error(`${req.name} is required but not installed`)
        allGood = false
      } else {
        warning(`${req.name} not found (optional)`)
      }
    }
  }

  if (!allGood) {
    error('Please install missing prerequisites before continuing')
    process.exit(1)
  }
}

function setupEnvironment() {
  header('Setting up Environment')
  
  const envExample = '.env.example'
  const envFile = '.env'
  
  if (!existsSync(envExample)) {
    error('.env.example file not found')
    return false
  }
  
  if (existsSync(envFile)) {
    warning('.env file already exists, skipping creation')
    return true
  }
  
  try {
    const envContent = readFileSync(envExample, 'utf8')
    writeFileSync(envFile, envContent)
    success('Created .env file from template')
    warning('Please edit .env file with your actual credentials')
    return true
  } catch (err) {
    error('Failed to create .env file')
    return false
  }
}

function installDependencies() {
  header('Installing Dependencies')
  return runCommand('pnpm install', 'Installing npm packages')
}

function setupSupabase() {
  header('Setting up Supabase')
  
  info('Please ensure you have:')
  console.log('  1. Created a Supabase project at https://supabase.com')
  console.log('  2. Updated your .env file with Supabase credentials')
  console.log('  3. Logged in to Supabase CLI with: supabase login')
  
  const proceed = process.argv.includes('--auto') || 
    confirm('\nHave you completed the above steps? (y/n): ')
  
  if (!proceed) {
    warning('Skipping Supabase setup. Run this script again when ready.')
    return false
  }
  
  // Check if already linked
  if (existsSync('.supabase/config.toml')) {
    info('Supabase project already linked')
  } else {
    warning('Please link your Supabase project manually:')
    console.log('  supabase link --project-ref your-project-id')
    return false
  }
  
  return true
}

function applyMigrations() {
  header('Applying Database Migrations')
  return runCommand('supabase db push', 'Applying database migrations')
}

function deployFunctions() {
  header('Deploying Edge Functions')
  
  const functions = [
    'capture-referral',
    'partner-summary', 
    'process-payment',
    'payment-webhook'
  ]
  
  let allDeployed = true
  
  for (const func of functions) {
    const success = runCommand(
      `supabase functions deploy ${func}`,
      `Deploying ${func} function`
    )
    if (!success) allDeployed = false
  }
  
  return allDeployed
}

function generateTypes() {
  header('Generating TypeScript Types')
  return runCommand(
    'supabase gen types typescript --local > shared/database.types.ts',
    'Generating database types'
  )
}

function runTests() {
  header('Running Tests')
  return runCommand('pnpm typecheck', 'TypeScript type checking')
}

function printNextSteps() {
  header('Setup Complete! 🎉')
  
  console.log('\n📋 Next Steps:')
  console.log('  1. Edit .env file with your API credentials')
  console.log('  2. Configure payment gateway webhooks')
  console.log('  3. Set up partner API keys')
  console.log('  4. Start development server: pnpm dev')
  console.log('\n📚 Documentation:')
  console.log('  • README.md - Project overview')
  console.log('  • DEPLOYMENT.md - Deployment guide')
  console.log('\n🔗 Useful Links:')
  console.log('  • Supabase Dashboard: https://supabase.com/dashboard')
  console.log('  • Local Development: http://localhost:8080')
  console.log('  • Supabase Studio: http://localhost:54323')
}

function confirm(question) {
  // In a real implementation, you'd use a proper prompt library
  // For now, we'll assume auto-confirmation in CI/automated environments
  return process.argv.includes('--yes') || process.argv.includes('-y')
}

async function main() {
  try {
    log(`${colors.bold}${colors.blue}🍱 OZ Kitchen Setup Script${colors.reset}\n`)
    
    checkPrerequisites()
    
    if (!setupEnvironment()) {
      process.exit(1)
    }
    
    if (!installDependencies()) {
      process.exit(1)
    }
    
    if (setupSupabase()) {
      applyMigrations()
      deployFunctions()
      generateTypes()
    }
    
    runTests()
    printNextSteps()
    
  } catch (err) {
    error('Setup failed with error:')
    console.error(err)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
