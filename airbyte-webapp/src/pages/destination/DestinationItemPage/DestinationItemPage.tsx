import React, { Suspense } from "react";
import { useIntl } from "react-intl";
import { Outlet, useParams } from "react-router-dom";

import { LoadingPage } from "components";
import { ApiErrorBoundary } from "components/common/ApiErrorBoundary";
import { HeadTitle } from "components/common/HeadTitle";
import { ConnectorNavigationTabs } from "components/connector/ConnectorNavigationTabs";
import { ConnectorTitleBlock } from "components/connector/ConnectorTitleBlock";
import { StepsTypes } from "components/ConnectorBlocks";
import { NextPageHeaderWithNavigation } from "components/ui/PageHeader/NextPageHeaderWithNavigation";

import { useTrackPage, PageTrackingCodes } from "core/services/analytics";
import { FeatureItem, useFeature } from "core/services/features";
import { useAppMonitoringService } from "hooks/services/AppMonitoringService";
import InlineEnrollmentCallout from "packages/cloud/components/experiments/FreeConnectorProgram/InlineEnrollmentCallout";
import { isDestinationDefinitionEligibleForFCP } from "packages/cloud/components/experiments/FreeConnectorProgram/lib/model";
import { RoutePaths } from "pages/routePaths";
import { useDestinationDefinition } from "services/connector/DestinationDefinitionService";
import { ResourceNotFoundErrorBoundary } from "views/common/ResourceNotFoundErrorBoundary";
import { StartOverErrorView } from "views/common/StartOverErrorView";
import { ConnectorDocumentationWrapper } from "views/Connector/ConnectorDocumentationLayout";

import { useGetDestinationFromParams } from "../useGetDestinationFromParams";

export const DestinationItemPage: React.FC = () => {
  useTrackPage(PageTrackingCodes.DESTINATION_ITEM);
  const params = useParams<{ workspaceId: string; "*": StepsTypes | "" | undefined }>();
  const destination = useGetDestinationFromParams();
  const destinationDefinition = useDestinationDefinition(destination.destinationDefinitionId);
  const { formatMessage } = useIntl();
  const fcpEnabled = useFeature(FeatureItem.FreeConnectorProgram);

  const { trackError } = useAppMonitoringService();

  const breadcrumbBasePath = `/${RoutePaths.Workspaces}/${params.workspaceId}/${RoutePaths.Destination}`;

  const breadcrumbsData = [
    {
      label: formatMessage({ id: "sidebar.destinations" }),
      to: `${breadcrumbBasePath}/`,
    },
    { label: destination.name },
  ];

  return (
    <ResourceNotFoundErrorBoundary errorComponent={<StartOverErrorView />} trackError={trackError}>
      <ConnectorDocumentationWrapper>
        <HeadTitle titles={[{ id: "admin.destinations" }, { title: destination.name }]} />
        <NextPageHeaderWithNavigation breadcrumbsData={breadcrumbsData}>
          <ConnectorTitleBlock connector={destination} connectorDefinition={destinationDefinition} />
          {fcpEnabled && isDestinationDefinitionEligibleForFCP(destinationDefinition) && <InlineEnrollmentCallout />}
          <ConnectorNavigationTabs connectorType="destination" connector={destination} id={destination.destinationId} />
        </NextPageHeaderWithNavigation>
        <Suspense fallback={<LoadingPage />}>
          <ApiErrorBoundary>
            <Outlet />
          </ApiErrorBoundary>
        </Suspense>
      </ConnectorDocumentationWrapper>
    </ResourceNotFoundErrorBoundary>
  );
};
