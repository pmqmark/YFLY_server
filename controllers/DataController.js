const { default: mongoose } = require("mongoose");
const Data = require("../models/DataModel");
const ObjectId = require("mongoose").Types.ObjectId;
const dataCtrl = {}

// Not in use
dataCtrl.addData = async (req, res) => {

    try {
        const { name, list = [] } = req.body;

        if (!name?.trim()) return res.status(400).json({ msg: "Bad Request" });

        const theDoc = await Data.findOne({ name: name })

        let result = {}

        let altList = [];

        if (Array.isArray(list) && list?.length) {
            const existingIds = new Set(theDoc.list.map(el => String(el._id)));
            const existingLabels = new Set(theDoc.list.map(el => el.label.trim()));

            altList = list.filter(obj =>
                !existingIds.has(String(obj._id)) && !existingLabels.has(obj.label.trim())
            );
        }

        if (theDoc) {
            const updatedDoc = await Data.findByIdAndUpdate(theDoc._id, {
                $push: { list: { $each: altList } }
            }, { new: true })

            console.log(updatedDoc)

            result = updatedDoc

        } else {
            const newDoc = await Data.create({
                name: name,
                list: [...list]
            })

            console.log(newDoc)

            result = newDoc
        }

        res.status(200).json({ data: result })
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: "Something went wrong" })
    }
}

// Not in use
dataCtrl.editData = async (req, res) => {

    try {
        const { id } = req.params;
        const { list = [] } = req.body;

        if (!list?.length) {
            return res.status(400).json({ msg: "Empty list" });
        }

        const updatedDoc = await Data.findByIdAndUpdate(id, {
            $set: { list }
        }, { new: true })

        if (!updatedDoc) return res.status(400).json({ msg: "Bad Request" });

        console.log(updatedDoc)

        res.status(200).json({ data: updatedDoc })
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: "Something went wrong" })
    }
}


// used middlewares ==>
    
dataCtrl.addLabel = async (req, res) => {

    try {
        const { name, label } = req.body;

        if (!(name?.trim() && label?.trim())) return res.status(400).json({ msg: "Bad Request" });

        const theDoc = await Data.findOne({ name: name })

        let result = {}

        if (theDoc) {
            const existingLabels = theDoc?.list?.map((obj)=> obj?.label)
            if(existingLabels.includes(label)){ return res.status(400).json({ msg: "Label already exists" })}

            const updatedDoc = await Data.findByIdAndUpdate(theDoc._id, {
                $push: { list: { label } }
            }, { new: true })

            console.log(updatedDoc)

            result = updatedDoc

        } else {
            const newDoc = await Data.create({
                name: name,
                list: [{ label }]
            })

            console.log(newDoc)

            result = newDoc
        }

        res.status(200).json({ data: result })
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: "Something went wrong" })
    }
}

dataCtrl.editLabel = async (req, res) => {

    try {
        
        const {name, list_id, label } = req.body;
        if (!mongoose.isValidObjectId(list_id)) { return res.status(400).json({ msg: "Invalid Id" }) }

        if (!label?.trim()) return res.status(400).json({ msg: "Bad Request" });

        const updatedDoc = await Data.findOneAndUpdate({name: name, "list._id": list_id}, {
            $set: { "list.$.label": label }
        }, { new: true })

        console.log({ dataxxx: updatedDoc })

        res.status(200).json({ data: updatedDoc })
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: "Something went wrong" })
    }
}

dataCtrl.getData = async (req, res) => {

    try {
        const name = req.query.name;

        if (!name) return res.status(400).json({ msg: "Bad Request" })

        const data = await Data.findOne({ name: name })
        if (!data) return res.status(400).json({ msg: "Data Not Found" })
        console.log(data)

        res.status(200).json({ data })
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: "Something went wrong" })
    }
}

dataCtrl.getAllData = async (req, res) => {

    try {
        const data = await Data.find()
        if (!data) return res.status(400).json({ msg: "Data Not Found" })
        console.log(data)

        res.status(200).json({ data })
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: "Something went wrong" })
    }
}

module.exports = dataCtrl;