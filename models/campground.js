const mongoose = require("mongoose");
const Review = require("./review");

const ImagesSchema = new mongoose.Schema({
    url: String,
    filename: String
});
ImagesSchema.virtual("thumbnail").get(function () {
    return this.url.replace("/upload", "/upload/w_200")
})

const CampgroundSchama = new mongoose.Schema({
    title: String,
    images: [
        // {
        //     url: String,
        //     filename: String
        // }
        ImagesSchema
    ],
    price: Number,
    description: String,
    location: String,
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    reviews:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review"
        }
    ]
});

//this mongoose middleware deletes all the reviews of a campground after deleting the particular campground
CampgroundSchama.post("findOneAndDelete", async function(doc){
    if(doc){
        await Review.deleteMany({
            _id: {
                $in: doc.reviews
            }
        })
    }
})

module.exports = mongoose.model("Campground", CampgroundSchama);