SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count
FROM _prisma_migrations
ORDER BY started_at DESC
LIMIT 10;
