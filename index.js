const express = require("express")
const mongoose = require("mongoose");
const cors = require('cors');
const jwt = require('jsonwebtoken')
const User = require('./models/user');
const bcrypt = require('bcryptjs');
const multer  = require('multer')
const fs = require('fs')
const postModel = require("./models/Post")
const app = express()
const secret = 'dfsdlkfjsdlfja;j'
const salt = bcrypt.genSaltSync(10)
const cookieParser = require('cookie-parser')
const uploadMiddleware = multer({ dest: 'uploads/' })
app.use(cors({credentials: true, origin: 'http://localhost:3000'}))
app.use(cookieParser())
app.use(express.json())
app.use('/uploads', express.static(__dirname + '/uploads'))
mongoose.connect('mongodb://127.0.0.1:27017/blog')

app.post('/register', async (req, res) =>{
    const {username, password} = req.body;
    try{
        const userDoc = await User.create({
            username, 
            password: bcrypt.hashSync(password, salt)
        })
        res.json(userDoc)
    }catch(err){
        res.status(400).json(err)
    }
})

app.post('/login', async(req, res)=>{
    const {username, password} = req.body;
    const userDoc = await User.findOne({username})
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if(passOk){
        // res.json({passOk})
        jwt.sign({username, id: userDoc._id}, secret, {}, (err, token)=>{
            if(err) throw err;
            res.cookie('token', token).json({
                id: userDoc._id,
                username,
            })
        })
        // user login 
    }else{
        // user not login
        res.status(400).json({message: 'wrong credentails'})
    }
})

app.get("/profile", (req, res) => {
   const { token } = req.cookies
    jwt.verify(token, secret, {}, (err, info)=>{
        if(err) throw err;
        res.json(info)
    })

})

app.post("/logout", (req, res) =>{
    res.cookie('token', '').json('okey')
})

app.post("/post", uploadMiddleware.single('file'),(req, res)=>{
    const { originalname, path } = req.file;
    const parts  = originalname.split('.');
    const ext = parts[parts.length -1];
    const newPath = path+'.'+ext
    fs.renameSync(path, newPath)
    
    const { title, summary, content } = req.body;
    const { token } = req.cookies
    jwt.verify(token, secret, {}, async (err, info)=>{
        if(err) throw err;
        const postDoc = await postModel.create({
            title,
            summary,
            content,
            cover: newPath,   
            author: info.id 
        })
            
        res.json({postDoc});
    })
    
})

app.get("/post", async (req, res) =>{
    
    res.json(await postModel.find()
    .populate('author', ['username'])
    .sort({createdAt: -1})
    .limit(20)
    )
})

app.get("/post/:id", async (req, res) =>{
    const { id } = req.params;
    const UserInfo = await postModel.findById(id).populate('author', ['username']);
    res.json(UserInfo);

})

app.put('/post/', uploadMiddleware.single('file'),(req, res) =>{
    let newPath = null
    if(req.file){
        res.json(req.file)
        const { originalname, path } = req.file;
        const parts  = originalname.split('.');
        const ext = parts[parts.length -1];
        newPath = path+'.'+ext
        fs.renameSync(path, newPath)
    }

    const { token } = req.cookies
    jwt.verify(token, secret, {}, async (err, info)=>{
        if(err) throw err;
        const {id, title, summary, content} = req.body
        const postDoc = await postModel.findById(id)

        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id)
        if(isAuthor === false){
            return res.status(400).json({message: 'you are not an author of this post'})
        }else{
            await postDoc.updateOne({
                title,
                summary,
                content,
                cover: newPath?newPath : postDoc.cover
            })
            res.json(postDoc)
        }

       
    })
})

app.listen(4000, () =>{
    console.log('server is started at port 4000')
})