#!/usr/bin/env node

/**
 * Generate a Plex Client ID for ClipShare
 * 
 * This script generates a UUID that can be used as a Plex Client ID.
 * Client IDs are safe to commit to git as they're just public identifiers.
 */

import { randomUUID } from 'crypto'

const clientId = randomUUID()
console.log('Generated Plex Client ID:')
console.log(clientId)
console.log('')
console.log('You can use this as your PLEX_CLIENT_ID in your .env file.')
console.log('This is safe to commit to git as it\'s just a public identifier.')
