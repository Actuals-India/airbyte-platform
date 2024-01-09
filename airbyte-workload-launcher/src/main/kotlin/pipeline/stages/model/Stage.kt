package io.airbyte.workload.launcher.pipeline.stages.model

import io.airbyte.metrics.lib.ApmTraceUtils
import io.airbyte.metrics.lib.MetricAttribute
import io.airbyte.workload.launcher.metrics.CustomMetricPublisher
import io.airbyte.workload.launcher.metrics.MeterFilterFactory.Companion.STAGE_NAME_TAG
import io.airbyte.workload.launcher.metrics.MeterFilterFactory.Companion.WORKLOAD_TYPE_TAG
import io.airbyte.workload.launcher.metrics.WorkloadLauncherMetricMetadata
import io.airbyte.workload.launcher.pipeline.stages.StageName
import io.github.oshai.kotlinlogging.KotlinLogging
import io.github.oshai.kotlinlogging.withLoggingContext
import reactor.core.publisher.Mono
import reactor.kotlin.core.publisher.toMono
import java.util.function.Function
import kotlin.time.TimeSource
import kotlin.time.toJavaDuration

typealias StageFunction<T> = Function<T, Mono<T>>

private val logger = KotlinLogging.logger {}

abstract class Stage<T : StageIO>(protected val metricPublisher: CustomMetricPublisher) : StageFunction<T> {
  override fun apply(input: T): Mono<T> {
    withLoggingContext(input.logCtx) {
      val startTime = TimeSource.Monotonic.markNow()

      if (skipStage(input)) {
        logger.info { "SKIP Stage: ${getStageName()} — (workloadId = ${input.msg.workloadId})" }
        return input.toMono()
      }

      logger.info { "APPLY Stage: ${getStageName()} — (workloadId = ${input.msg.workloadId})" }

      return try {
        applyStage(input).toMono()
      } catch (t: Throwable) {
        ApmTraceUtils.addExceptionToTrace(t)
        Mono.error(StageError(input, getStageName(), t))
      } finally {
        metricPublisher.timer(
          WorkloadLauncherMetricMetadata.WORKLOAD_STAGE_DURATION_TIMER,
          startTime.elapsedNow().toJavaDuration(),
          *getMetricAttrs(input).toTypedArray(),
          MetricAttribute(STAGE_NAME_TAG, getStageName().toString()),
        )
      }
    }
  }

  abstract fun applyStage(input: T): T

  abstract fun skipStage(input: StageIO): Boolean

  abstract fun getStageName(): StageName

  abstract fun getMetricAttrs(input: T): List<MetricAttribute>
}

abstract class LaunchStage(metricPublisher: CustomMetricPublisher) : Stage<LaunchStageIO>(metricPublisher) {
  override fun skipStage(input: StageIO): Boolean {
    return input !is LaunchStageIO || input.skip
  }

  override fun getMetricAttrs(input: LaunchStageIO): List<MetricAttribute> {
    return listOf(MetricAttribute(WORKLOAD_TYPE_TAG, input.msg.workloadType.toString()))
  }
}

class StageError(
  val io: StageIO,
  val stageName: StageName,
  override val cause: Throwable,
) : Throwable(cause)
