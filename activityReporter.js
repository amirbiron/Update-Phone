const { MongoClient, ServerApiVersion } = require('mongodb');

class SimpleActivityReporter {
    constructor(mongodbUri, serviceId, serviceName = null) {
        this.serviceId = serviceId;
        this.serviceName = serviceName || serviceId;
        this.connected = false;
        this.db = null;

        // Try to establish the connection immediately (fire-and-forget)
        MongoClient.connect(mongodbUri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
        })
            .then(client => {
                this.db = client.db('render_bot_monitor');
                this.connected = true;
            })
            .catch(err => {
                // Connection failed – keep the bot alive, but log a warning
                console.warn('⚠️  לא ניתן להתחבר למונגו – פעילות לא תירשם', err.message);
            });
    }

    /**
     * Reports a single user interaction.
     * @param {number|string} userId – Telegram user ID.
     */
    async reportActivity(userId) {
        if (!this.connected || !this.db) return;

        try {
            const now = new Date();

            // Update / insert user interaction stats
            await this.db.collection('user_interactions').updateOne(
                { service_id: this.serviceId, user_id: userId },
                {
                    $set: { last_interaction: now },
                    $inc: { interaction_count: 1 },
                    $setOnInsert: { created_at: now },
                },
                { upsert: true },
            );

            // Update / insert global service activity stats
            await this.db.collection('service_activity').updateOne(
                { _id: this.serviceId },
                {
                    $set: {
                        last_user_activity: now,
                        service_name: this.serviceName,
                        updated_at: now,
                    },
                    $setOnInsert: {
                        created_at: now,
                        status: 'active',
                        total_users: 0,
                        suspend_count: 0,
                    },
                },
                { upsert: true },
            );
        } catch (err) {
            // Silently ignore – activity reporting should never break bot flow
        }
    }
}

function createReporter(mongodbUri, serviceId, serviceName = null) {
    return new SimpleActivityReporter(mongodbUri, serviceId, serviceName);
}

module.exports = { createReporter };