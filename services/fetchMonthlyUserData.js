import Posts from '../model/Posts.js';
import { User } from '../model/User.js';

const fetchMonthlyUserData = async () => {
  try {
    // Calculate the start of the year
    const startOfYear = new Date();
    startOfYear.setMonth(startOfYear.getMonth() - 12);
    startOfYear.setDate(1);
    startOfYear.setHours(0, 0, 0, 0);

    // Fetch user data aggregated by month
    const monthlyUserData = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear },
        },
      },
      {
        $project: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
      },
      {
        $group: {
          _id: { year: '$year', month: '$month' },
          totalUsers: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          totalUsers: 1,
        },
      },
    ]);

    // Fetch post data aggregated by month
    const monthlyPostData = await Posts.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear },
        },
      },
      {
        $project: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
      },
      {
        $group: {
          _id: { year: '$year', month: '$month' },
          totalPosts: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          totalPosts: 1,
        },
      },
    ]);

    // Generate all months of the past year
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      };
    }).reverse(); // Reverse to get the most recent months first

    // Create a map from the monthly user and post data
    const monthlyUserDataMap = new Map(monthlyUserData.map(({ year, month, totalUsers }) => [`${year}-${month}`, totalUsers]));
    const monthlyPostDataMap = new Map(monthlyPostData.map(({ year, month, totalPosts }) => [`${year}-${month}`, totalPosts]));

    // Fill in missing months with zero counts for users and posts
    const fullMonthlyData = months.map(({ year, month }) => ({
      year,
      month,
      totalUsers: monthlyUserDataMap.get(`${year}-${month}`) || 0,
      totalPosts: monthlyPostDataMap.get(`${year}-${month}`) || 0,
    }));

    return fullMonthlyData;
  } catch (error) {
    console.error(`Error fetching monthly data: ${error.message}`);
    throw new Error(`Error fetching monthly data: ${error.message}`);
  }
};

export default fetchMonthlyUserData;
