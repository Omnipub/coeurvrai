import Stripe from 'stripe';
import { config } from '../utils/config';

/**
 * Client Stripe (abonnements premium — à implémenter).
 * Null tant que STRIPE_SECRET_KEY n'est pas configurée.
 */
export const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;
