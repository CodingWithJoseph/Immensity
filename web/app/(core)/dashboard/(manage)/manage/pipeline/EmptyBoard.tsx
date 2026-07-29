import { routes } from '@/app/util/routes'
import EmptyState from '@/app/(core)/dashboard/components/EmptyState'

export default function EmptyBoard() {
    return (
        <EmptyState
            title="Your pipeline is empty"
            description={
                <>
                Find an opportunity in Search and add it to your pipeline.
                Projects move through Watching, Building, and Launched.
                </>
            }
            actionLabel="Go to Search"
            actionHref={routes.core.explore}
        />
    )
}
