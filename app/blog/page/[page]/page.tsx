import ListLayout from '@/layouts/ListLayoutWithTags'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import { AlertTriangle } from 'lucide-react'

const POSTS_PER_PAGE = 5

export const generateStaticParams = async () => {
  const totalPages = Math.ceil(allBlogs.length / POSTS_PER_PAGE)
  const paths = Array.from({ length: totalPages }, (_, i) => ({ page: (i + 1).toString() }))

  return paths
}

export default function Page({ params }: { params: { page: string } }) {
  const posts = allCoreContent(sortPosts(allBlogs))
  const pageNumber = parseInt(params.page as string)
  const initialDisplayPosts = posts.slice(
    POSTS_PER_PAGE * (pageNumber - 1),
    POSTS_PER_PAGE * pageNumber
  )
  const pagination = {
    currentPage: pageNumber,
    totalPages: Math.ceil(posts.length / POSTS_PER_PAGE),
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <h3 className="mb-1 text-lg font-semibold text-gray-900">System Maintenance</h3>
            <p className="text-gray-600">
              We're currently performing scheduled maintenance to improve your experience. We'll be
              back shortly. Thank you for your patience.
            </p>
          </div>
        </div>
        <div className="mt-6 text-center text-sm text-gray-500">We will be back soon</div>
      </div>
    </div>
  )
}
