import "dotenv/config";
import pg from "pg";

const products = [
    ["11111111-1111-4111-8111-111111110001", "Chicken kibble for adult dogs, 3 kg", "Everyday chicken kibble for adult dogs.", 875000, 18, "/images/shop/shop-dog-kibble.jpg", "Dog food"],
    ["11111111-1111-4111-8111-111111110002", "Lamb meal for puppies, 2 kg", "A smaller bag for growing puppies.", 740000, 12, "/images/shop/shop-puppy-food.jpg", "Dog food"],
    ["22222222-2222-4222-8222-222222220001", "Salmon kibble for indoor cats, 2 kg", "Salmon kibble for cats who live indoors.", 690000, 16, "/images/shop/shop-cat-kibble.jpg", "Cat food"],
    ["22222222-2222-4222-8222-222222220002", "Chicken pouches for kittens, 12 pack", "Soft meals for kittens.", 455000, 10, "/images/shop/shop-kitten-pouches.jpg", "Cat food"],
    ["33333333-3333-4333-8333-333333330001", "Cotton rope tug", "A knotted cotton rope for a game of tug.", 150000, 14, "/images/shop/shop-rope-toy.jpg", "Dog accessories and toys"],
    ["33333333-3333-4333-8333-333333330002", "Everyday nylon leash", "A navy leash for daily walks.", 220000, 9, "/images/shop/shop-dog-leash.jpg", "Dog accessories and toys"],
    ["44444444-4444-4444-8444-444444440001", "Feather wand", "A feather wand for a short game.", 95000, 20, "/images/shop/shop-feather-wand.jpg", "Cat accessories"],
    ["44444444-4444-4444-8444-444444440002", "Sisal scratching post", "A small post wrapped in sisal.", 980000, 4, "/images/shop/shop-scratch-post.jpg", "Cat accessories"],
    ["55555555-5555-4555-8555-555555550001", "Mineral lick block", "A salt lick for goats and sheep.", 260000, 8, "/images/shop/shop-mineral-lick.jpg", "Ruminant products"],
    ["55555555-5555-4555-8555-555555550002", "Mixed grain feed, 10 kg", "A sack of mixed grain for ruminants.", 510000, 6, "/images/shop/shop-goat-feed.jpg", "Ruminant products"],
    ["66666666-6666-4666-8666-666666660001", "Flea spot-on for dogs", "A spot-on bottle kept at the clinic.", 390000, 11, "/images/shop/shop-flea-bottle.jpg", "Medication and veterinary products"],
    ["66666666-6666-4666-8666-666666660002", "Deworming tablets", "Tablets the clinic can hand over with a visit.", 240000, 0, "/images/shop/shop-tablets.jpg", "Medication and veterinary products"],
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
    for (const [id, name, description, price, stock, photoUrl, category] of products) {
        const found = await client.query(`SELECT id FROM product_category WHERE name = $1`, [category]);
        const categoryId = found.rows[0]?.id;
        if (!categoryId) throw new Error(`Missing category: ${category}`);
        await client.query(
            `INSERT INTO product (id, name, description, price, stock, "photoUrl", available, "categoryId")
             VALUES ($1, $2, $3, $4, $5, $6, true, $7)
             ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                price = EXCLUDED.price,
                stock = EXCLUDED.stock,
                "photoUrl" = EXCLUDED."photoUrl",
                available = true,
                "categoryId" = EXCLUDED."categoryId"`,
            [id, name, description, price, stock, photoUrl, categoryId],
        );
    }
    console.log(`Saved ${products.length} sample products.`);
} finally {
    await client.end();
}
