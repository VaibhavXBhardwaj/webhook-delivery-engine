import crypto from 'crypto';
import prisma from '../lib/prisma';
import config from '../config';
import logger from '../lib/logger';

export async function registerClient(name: string) {
  // Generate a secure API key: whe_<64 random hex chars>
  const apiKey = `${config.security.apiKeyPrefix}_${crypto
    .randomBytes(32)
    .toString('hex')}`;

  const client = await prisma.client.create({
    data: {
      name,
      apiKey,
    },
  });

  logger.info(`New client registered: ${client.name} (${client.id})`);

  return {
    id: client.id,
    name: client.name,
    apiKey: client.apiKey, // Only returned ONCE at registration
    createdAt: client.createdAt,
    message:
      'Store your API key safely. It will not be shown again.',
  };
}

export async function getClientById(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      createdAt: true,
      // Never return the API key after registration
    },
  });

  return client;
}