const mongoose = require("mongoose");
mongoose.set('strictQuery', false);
const Campground = require("../models/campground");
const cities = require("./cities");
const {places, descriptors} = require("./seedHelpers");

const DB = "mongodb+srv://campground:1234camp@cluster0.nlnxf9j.mongodb.net/campgroundAgain";
mongoose.connect(DB,{
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(con => {
    console.log("DB connection seccessful");
}).catch(e=>{
    console.log(e);
})

const seedDB = async() =>{
    await Campground.deleteMany({});
    for(let i=0;i<50;i++){
        const random1000 = Math.floor(Math.random()*1000);
        const random18 = Math.floor(Math.random()*18);
        const price = Math.floor(Math.random()*20)+10;
        await Campground.create({
            author: "63cdf439d1c72b9fb839eafe",
            location: `${cities[random1000].city}, ${cities[random1000].state}`,
            title: `${descriptors[random18]} ${places[random18]}`,
            images: [
                  {
                    url: 'https://res.cloudinary.com/dywjchq8q/image/upload/v1674581036/YelpCampAgain/qkdargevxy42gegls8lu.jpg',
                    filename: 'YelpCampAgain/qkdargevxy42gegls8lu',
                  },
                  {
                    url: 'https://res.cloudinary.com/dywjchq8q/image/upload/v1674581039/YelpCampAgain/entkcmwqlsoj3nviihsy.jpg',
                    filename: 'YelpCampAgain/entkcmwqlsoj3nviihsy',
                  }
            ],
            description:"Lorem ipsum dolor, sit amet consectetur adipisicing elit. Ullam amet beatae esse ipsum quibusdam ducimus, necessitatibus, cupiditate reprehenderit magnam rerum temporibus veritatis accusamus ut nemo qui repellendus nam perspiciatis aut.",
            price,
        })
    }
}

seedDB().then(()=>{
    mongoose.connection.close();
});