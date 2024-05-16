import mongoose, { model,Schema } from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      minlength: [8, 'Title must be atleast 8 characters'],
      maxlength: [50, 'Title cannot be more than 50 characters'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [20, 'Description must be atleast 20 characters long']
    },
    category: {
      type: String,
      required: [true, 'Category is required']
    },
    lectures: [
      {
        title: String,
        description: String,
        lecture: {
          public_id: {
            type: String,
            required: true
          },
          secure_url: {
            type: String,
            required: true
          }
        }
      }
    ],
    thumbnail: {
      public_id: {
        type: String
      },
      secure_url: {
        type: String
      }
    },
    numberOfLectures: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);
mongoose.plugin(mongooseAggregatePaginate);
const Course = model('Course', courseSchema);

export default Course;